import type { GardenMap, GardenObject } from '../api/types'
import type { Atlas } from './atlas'
import { TILE, tileFrame, type Cell } from './layout'

/** Кадр персонажа: 32×48, низ — по низу клетки. */
export const CHARACTER_WIDTH = 32
export const CHARACTER_HEIGHT = 48

/**
 * Персонаж: готовая картинка 32×48 и точка его ступней в логических пикселях.
 * flip — смотрит влево (боковой кадр нарисован вправо), lift — подпрыгивание при ходьбе.
 */
export type CharacterSprite = {
  px: number
  py: number
  image: CanvasImageSource
  flip?: boolean
  lift?: number
  /** Неподвижный свет у стоящего персонажа (фонарь Вереска) — смещение от ступней */
  light?: Light
}

/** Персонаж, стоящий в клетке: ступни по центру у нижнего края. */
export function standingAt(cell: Cell, image: CanvasImageSource, light?: Light): CharacterSprite {
  return { px: cell.x * TILE + TILE / 2, py: cell.y * TILE + TILE - 2, image, light }
}

/** Всё, что меняется у игрока: растения, пробуждённые объекты, мерцания, персонажи. */
export type Scene = {
  objects: GardenObject[]
  awakened: ReadonlySet<string>
  sparkles: ReadonlySet<string>
  characters: CharacterSprite[]
  /** Клетки, над чьими персонажами горит «!» новостей */
  bubbles: Cell[]
  /** Точка над объектом рядом с персонажем, с которым можно взаимодействовать (золотой «!») */
  prompt?: { x: number; y: number } | null
  /** Точка над целью текущего задания (стрелка) */
  marker?: { x: number; y: number } | null
  /** Ступни идущего игрока: вокруг него ореол, снимающий сумерки */
  aura?: { x: number; y: number } | null
  /** Время в мс — для покачивания стрелки */
  time?: number
}

/**
 * Рисует сад в логических пикселях (1 тайл = 32). Масштаб задаётся трансформацией контекста,
 * сглаживание выключено — пиксели остаются чёткими.
 * Порядок слоёв: земля → постройки, растения и персонажи (сверху вниз, чтобы нижние перекрывали верхние)
 * → сумерки и свет → значки, которые должны читаться в темноте.
 */
export function drawGarden(
  ctx: CanvasRenderingContext2D,
  map: GardenMap,
  atlas: Atlas,
  scene: Scene,
) {
  const { objects, awakened, sparkles, characters, bubbles, prompt, marker, time = 0 } = scene
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, map.width * TILE, map.height * TILE)

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      drawFrame(ctx, atlas, tileFrame(map, x, y), x * TILE, y * TILE)
    }
  }

  // Постройки и растения рисуем вместе, по нижнему краю: что ближе к зрителю — поверх
  const sprites = [
    ...map.props.map((p) => ({
      bottom: p.y + p.height,
      // пробуждённый магический объект рисуется своим кадром
      frame: awakened.has(p.key) ? `prop_${p.kind}_awakened` : `prop_${p.kind}`,
      x: p.x * TILE,
      y: p.y * TILE,
    })),
    // кадр растения 32×48: низ совпадает с низом клетки, верх выступает над ней
    ...objects.map((o) => ({ bottom: o.y + 1, frame: `plant_${o.speciesKey}_${o.stage}`, x: o.x * TILE, y: o.y * TILE - 16 })),
  ].sort((a, b) => a.bottom - b.bottom)
  // Персонажи и постройки — по глубине: кто ниже на экране, тот ближе и рисуется позже
  const people = [...characters].sort((a, b) => a.py - b.py)
  let next = 0
  for (const sprite of sprites) {
    while (next < people.length && people[next].py < sprite.bottom * TILE) drawCharacter(ctx, people[next++])
    drawFrame(ctx, atlas, sprite.frame, sprite.x, sprite.y)
  }
  while (next < people.length) drawCharacter(ctx, people[next++])

  drawLighting(
    ctx,
    map,
    awakened,
    characters.flatMap((c) => (c.light ? [{ ...c.light, x: c.px + c.light.x, y: c.py + c.light.y }] : [])),
    scene.aura && { x: scene.aura.x, y: scene.aura.y + AURA.lift },
  )

  // Всё, что должно читаться в темноте, — после света: мерцание тайников, «!» и стрелка
  for (const prop of map.props) {
    if (sparkles.has(prop.key)) {
      drawFrame(ctx, atlas, 'fx_sparkle', (prop.x + prop.width) * TILE - 10, prop.y * TILE + 1)
    }
  }
  for (const cell of bubbles) {
    drawFrame(ctx, atlas, 'fx_bubble', cell.x * TILE + 12, cell.y * TILE - (CHARACTER_HEIGHT - TILE) - 8)
  }

  if (prompt) drawFrame(ctx, atlas, 'fx_interact', Math.round(prompt.x - 3), Math.round(prompt.y - 15))
  if (marker) {
    const bob = Math.round(Math.sin(time / 220) * 2)
    drawFrame(ctx, atlas, 'fx_arrow', Math.round(marker.x - 6), Math.round(marker.y - 13 + bob))
  }
}

/** Источник света в логических пикселях: радиус и сила (0..1). */
export type Light = { x: number; y: number; radius: number; strength: number }

/**
 * Свет у построек — смещения от левого верхнего угла постройки. Сарай светится окном и дверью,
 * у двери свет ещё и падает на землю; пробуждённая чаша мерцает сама.
 */
const PROP_LIGHTS: Record<string, [number, number, number, number][]> = {
  shed: [
    [29, 63, 40, 0.85],
    [83, 72, 50, 1],
    [83, 102, 38, 0.75],
  ],
  basin_awakened: [[16, 14, 40, 0.8]],
}

function propLights(map: GardenMap, awakened: ReadonlySet<string>): Light[] {
  return map.props.flatMap((p) => {
    const key = awakened.has(p.key) ? `${p.kind}_awakened` : p.kind
    return (PROP_LIGHTS[key] ?? []).map(([dx, dy, radius, strength]) => ({ x: p.x * TILE + dx, y: p.y * TILE + dy, radius, strength }))
  })
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)

/** Темнота без света: в середине сада сумерки, к краям — почти ночь, как в лесу Inscryption. */
const AMBIENT_CENTER = 0.32
const AMBIENT_EDGE = 0.8

type LightLayer = { key: string; dark: HTMLCanvasElement; work: HTMLCanvasElement }
let layer: LightLayer | null = null

/**
 * Сумерки и свет. Темнота и тёплые ореолы ложатся ступенями через матрицу Байера —
 * без плавных градиентов, чтобы свет оставался пиксельным.
 *
 * Дорогая попиксельная часть считается один раз — пока не изменятся карта и неподвижный свет
 * (постройки, фонарь стоящего Вереска). Ореол идущего игрока — готовая картинка, которая каждый кадр
 * «вырезает» темноту вокруг него (destination-out): два drawImage вместо пересчёта всей карты.
 */
function drawLighting(ctx: CanvasRenderingContext2D, map: GardenMap, awakened: ReadonlySet<string>, still: Light[], aura?: { x: number; y: number } | null) {
  const w = map.width * TILE
  const h = map.height * TILE
  const key = `${map.key}|${[...awakened].sort().join(',')}|${still.map((l) => `${l.x},${l.y},${l.radius}`).join(';')}`
  if (layer?.key !== key) layer = { key, dark: bakeDarkness(w, h, [...propLights(map, awakened), ...still]), work: layer?.work ?? document.createElement('canvas') }

  if (!aura) {
    ctx.drawImage(layer.dark, 0, 0)
    return
  }
  const { dark, work } = layer
  if (work.width !== w || work.height !== h) {
    work.width = w
    work.height = h
  }
  const wctx = work.getContext('2d')!
  wctx.globalCompositeOperation = 'copy'
  wctx.drawImage(dark, 0, 0)
  wctx.globalCompositeOperation = 'destination-out'
  const sprite = auraSprite()
  wctx.drawImage(sprite, Math.round(aura.x - sprite.width / 2), Math.round(aura.y - sprite.height / 2))
  wctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(work, 0, 0)
}

/** Темнота с неподвижным светом — попиксельно, один раз на карту и набор огней. */
function bakeDarkness(w: number, h: number, lights: Light[]): HTMLCanvasElement {
  const light = new Float32Array(w * h)
  for (const l of lights) addLight(light, w, h, l)
  const image = new ImageData(w, h)
  const data = image.data
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = (x - w / 2) / (w / 2)
      const ny = (y - h * 0.45) / (h / 2)
      const edge = Math.min(1, Math.max(0, Math.hypot(nx * 0.85, ny) - 0.35) / 0.75)
      const ambient = AMBIENT_CENTER + (AMBIENT_EDGE - AMBIENT_CENTER) * edge * edge
      const i = y * w + x
      const lit = Math.min(1, light[i])
      const threshold = BAYER[(y & 3) * 4 + (x & 3)]
      // темнота: 5 ступеней, свет её съедает
      const dark = Math.floor(ambient * (1 - lit) * 4 + threshold) / 4
      const o = i * 4
      if (lit > 0.35 && Math.floor((lit - 0.35) * 3 + threshold) > 0) {
        data.set([255, 168, 72, 34], o) // тёплый отсвет лампы
      } else {
        data.set([8, 7, 12, Math.round(dark * 0.92 * 255)], o)
      }
    }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.putImageData(image, 0, 0)
  return canvas
}

/** Ореол игрока: насколько он снимает темноту вокруг — ступенями через Байера, к краю слабее. */
const AURA = { radius: 44, strength: 0.5, lift: -14 }
let aura: HTMLCanvasElement | null = null
function auraSprite(): HTMLCanvasElement {
  if (aura) return aura
  const size = AURA.radius * 2
  const image = new ImageData(size, size)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - AURA.radius, y - AURA.radius) / AURA.radius
      if (d >= 1) continue
      const cut = Math.min(1, (1 - d) * (1 - d) * 1.6 * AURA.strength)
      const step = Math.floor(cut * 4 + BAYER[(y & 3) * 4 + (x & 3)]) / 4
      image.data.set([0, 0, 0, Math.round(step * 255)], (y * size + x) * 4)
    }
  aura = document.createElement('canvas')
  aura.width = size
  aura.height = size
  aura.getContext('2d')!.putImageData(image, 0, 0)
  return aura
}

/** Прибавить свет одного источника: мягкий спад к краю радиуса. */
function addLight(target: Float32Array, w: number, h: number, l: Light) {
  const x0 = Math.max(0, Math.floor(l.x - l.radius))
  const x1 = Math.min(w - 1, Math.ceil(l.x + l.radius))
  const y0 = Math.max(0, Math.floor(l.y - l.radius))
  const y1 = Math.min(h - 1, Math.ceil(l.y + l.radius))
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - l.x, y - l.y) / l.radius
      if (d < 1) target[y * w + x] += (1 - d) * (1 - d) * 1.6 * l.strength
    }
}

function drawCharacter(ctx: CanvasRenderingContext2D, c: CharacterSprite) {
  const left = Math.round(c.px - CHARACTER_WIDTH / 2)
  const top = Math.round(c.py - CHARACTER_HEIGHT + 2 - (c.lift ?? 0))
  if (!c.flip) {
    ctx.drawImage(c.image, left, top)
    return
  }
  ctx.save()
  ctx.translate(left + CHARACTER_WIDTH, top)
  ctx.scale(-1, 1)
  ctx.drawImage(c.image, 0, 0)
  ctx.restore()
}

function drawFrame(ctx: CanvasRenderingContext2D, atlas: Atlas, name: string, x: number, y: number) {
  const f = atlas.frames[name]
  if (!f) return // нет кадра — пропускаем, а не ломаем весь кадр сцены
  ctx.drawImage(atlas.image, f.x, f.y, f.w, f.h, x, y, f.w, f.h)
}
