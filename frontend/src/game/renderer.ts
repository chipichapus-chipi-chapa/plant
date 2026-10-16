import type { GardenMap, GardenObject } from '../api/types'
import type { Atlas } from './atlas'
import { hoeFrame, weedParticles, type WeedEffect } from './effects'
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
  /** Кадры «жизни на месте» (мышь шевелит ушами): [обычный, движение]; image — запасной */
  idle?: CanvasImageSource[]
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
  /** Точка над целью текущего задания — там покачивается «!» */
  marker?: { x: number; y: number } | null
  /**
   * Состояние постройки → свой кадр: awakened (пробуждена, починена), searched (обыскана),
   * open (замок открыт). Нет такого кадра в атласе — рисуется обычный.
   */
  variants?: ReadonlyMap<string, string>
  /** Идущие анимации: прополка (мотыга и вылетающие сорняки) */
  effects?: WeedEffect[]
  /** Насколько горят лампы (0..1): в помещении сначала темно, потом свет разгорается */
  lightLevel?: number
  /** Ступни идущего игрока: вокруг него ореол, снимающий сумерки */
  aura?: { x: number; y: number } | null
  /** Время в мс — для покачивания «!» над целью задания */
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
      frame: propFrame(atlas, p.kind, scene.variants?.get(p.key) ?? (awakened.has(p.key) ? 'awakened' : null)),
      x: p.x * TILE,
      y: p.y * TILE,
    })),
    // кадр растения 32×48: низ совпадает с низом клетки, верх выступает над ней
    ...objects.map((o) => ({ bottom: o.y + 1, frame: `plant_${o.speciesKey}_${o.stage}`, x: o.x * TILE, y: o.y * TILE - 16 })),
  ].sort((a, b) => a.bottom - b.bottom)
  // Персонажи и постройки — по глубине: кто ниже на экране, тот ближе и рисуется позже
  const people = [...characters].sort((a, b) => a.py - b.py)
  const drawPerson = (c: CharacterSprite) => drawCharacter(ctx, { ...c, image: idleImage(c, time) })
  let next = 0
  for (const sprite of sprites) {
    while (next < people.length && people[next].py < sprite.bottom * TILE) drawPerson(people[next++])
    drawFrame(ctx, atlas, sprite.frame, sprite.x, sprite.y)
  }
  while (next < people.length) drawPerson(people[next++])

  for (const effect of scene.effects ?? []) drawWeeding(ctx, atlas, effect, time - effect.at, scene.aura)

  drawLighting(
    ctx,
    map,
    awakened,
    characters.flatMap((c) => (c.light ? [{ ...c.light, x: c.px + c.light.x, y: c.py + c.light.y }] : [])),
    scene.aura && { x: scene.aura.x, y: scene.aura.y + AURA.lift },
    scene.lightLevel ?? 1,
  )

  // Всё, что должно читаться в темноте, — после света: мерцание тайников и знаки «!»
  for (const prop of map.props) {
    if (sparkles.has(prop.key)) {
      drawFrame(ctx, atlas, 'fx_sparkle', (prop.x + prop.width) * TILE - 10, prop.y * TILE + 1)
    }
  }
  // «!» — единственный знак в игре: новость у Вереска, предмет рядом и цель задания (она покачивается).
  // Если цель совпадает с уже горящим «!», второй не рисуем.
  const bangs = [
    ...bubbles.map((cell) => ({ x: cell.x * TILE + 15, y: cell.y * TILE - (CHARACTER_HEIGHT - TILE) + 7 })),
    ...(prompt ? [prompt] : []),
  ]
  for (const b of bangs) drawFrame(ctx, atlas, 'fx_interact', Math.round(b.x - 3), Math.round(b.y - 15))
  if (marker && !bangs.some((b) => Math.abs(b.x - marker.x) < 16 && Math.abs(b.y - marker.y) < 24)) {
    const bob = Math.round(Math.sin(time / 220) * 2)
    drawFrame(ctx, atlas, 'fx_interact', Math.round(marker.x - 3), Math.round(marker.y - 13 + bob))
  }
}

/** Источник света в логических пикселях: радиус и сила (0..1). */
export type Light = {
  x: number
  y: number
  radius: number
  strength: number
  /** Цвет отсвета [r, g, b]; без него — тёплый свет лампы */
  color?: Glow
}

type Glow = readonly [number, number, number]

/** Тёплый свет лампы и окон. */
const LAMP_GLOW: Glow = [255, 168, 72]
/** Светло-розовое свечение лилий и цветущей вишни. */
const PETAL_GLOW: Glow = [255, 178, 214]

/**
 * Свет у построек — смещения от левого верхнего угла постройки. Сарай светится окном и дверью,
 * у двери свет ещё и падает на землю; пробуждённая чаша мерцает сама.
 */
const PROP_LIGHTS: Record<string, [number, number, number, number, Glow?][]> = {
  shed: [
    [29, 63, 40, 0.85],
    [83, 72, 50, 1],
    [83, 102, 38, 0.75],
  ],
  basin_awakened: [[16, 14, 40, 0.8]],
  // в сарае: лампа на табурете и лунный свет из двери
  lamp: [[16, 10, 110, 1]],
  door_exit: [[16, 20, 34, 0.45]],
  // кухня поместья: угли в печи тлеют, у кресла — тёплый угол
  hearth: [[32, 20, 90, 0.85]],
  // поместье: тёплые окна, окошко в двери, фонарик у входа, чердак
  manor: [
    [33, 63, 56, 0.9],
    [159, 63, 56, 0.9],
    [137, 58, 44, 0.8],
    [112, 84, 44, 0.6],
  ],
  // исполинские лилии и цветущая вишня светятся изнутри светло-розовым
  giant_lily: [
    [30, 24, 70, 1, PETAL_GLOW],
    [49, 38, 40, 0.7, PETAL_GLOW],
  ],
  blossom_tree: [[32, 30, 58, 0.7, PETAL_GLOW]],
}

function propLights(map: GardenMap, awakened: ReadonlySet<string>): Light[] {
  return map.props.flatMap((p) => {
    const key = awakened.has(p.key) ? `${p.kind}_awakened` : p.kind
    return (PROP_LIGHTS[key] ?? []).map(([dx, dy, radius, strength, color]) => ({ x: p.x * TILE + dx, y: p.y * TILE + dy, radius, strength, color }))
  })
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)

/** Темнота без света: в середине сада сумерки, к краям — почти ночь, как в лесу Inscryption. */
const AMBIENT_CENTER = 0.32
const AMBIENT_EDGE = 0.8

type LightLayer = { key: string; lit: HTMLCanvasElement; unlit: HTMLCanvasElement | null; work: HTMLCanvasElement[] }
let layer: LightLayer | null = null

/**
 * Насколько разгорелась лампа через ms после входа в помещение: сначала темно,
 * потом фитиль пару раз вспыхивает и гаснет — и свет разгорается ровно. 1 — горит полностью.
 */
export function lampLevel(ms: number): number {
  if (ms < 450) return 0
  if (ms < 520) return 0.7
  if (ms < 600) return 0.15
  if (ms < 700) return 0.9
  if (ms < 760) return 0.4
  if (ms < 1100) return 0.4 + ((ms - 760) / 340) * 0.6
  return 1
}

/** Сколько длится «зажигание лампы» — пока оно идёт, кадр перерисовывается постоянно. */
export const LAMP_LIGHT_UP_MS = 1100

/**
 * Сумерки и свет. Темнота и тёплые ореолы ложатся ступенями через матрицу Байера —
 * без плавных градиентов, чтобы свет оставался пиксельным.
 *
 * Дорогая попиксельная часть считается один раз — пока не изменятся карта и неподвижный свет
 * (постройки, фонарь стоящего Вереска). Ореол идущего игрока — готовая картинка, которая каждый кадр
 * «вырезает» темноту вокруг него (destination-out): два drawImage вместо пересчёта всей карты.
 *
 * level < 1 — лампы ещё разгораются: поверх смешиваются слой «с огнями» и слой «в полной темноте».
 */
function drawLighting(
  ctx: CanvasRenderingContext2D,
  map: GardenMap,
  awakened: ReadonlySet<string>,
  still: Light[],
  aura: { x: number; y: number } | null | undefined,
  level: number,
) {
  const w = map.width * TILE
  const h = map.height * TILE
  const key = `${map.key}|${[...awakened].sort().join(',')}|${still.map((l) => `${l.x},${l.y},${l.radius}`).join(';')}`
  if (layer?.key !== key) {
    layer = { key, lit: bakeDarkness(w, h, [...propLights(map, awakened), ...still]), unlit: null, work: layer?.work ?? [] }
  }
  if (level < 1) layer.unlit ??= bakeDarkness(w, h, [], DARK_ROOM)

  const parts: [HTMLCanvasElement, number][] = level >= 1 ? [[layer.lit, 1]] : [[layer.lit, level], [layer.unlit!, 1 - level]]
  parts.forEach(([dark, alpha], i) => {
    if (alpha <= 0) return
    const source = aura ? cutAura(dark, aura, layerWork(i, w, h)) : dark
    ctx.globalAlpha = alpha
    ctx.drawImage(source, 0, 0)
  })
  ctx.globalAlpha = 1
}

function layerWork(i: number, w: number, h: number): HTMLCanvasElement {
  const work = (layer!.work[i] ??= document.createElement('canvas'))
  if (work.width !== w || work.height !== h) {
    work.width = w
    work.height = h
  }
  return work
}

/** Копия слоя темноты с вырезанным ореолом вокруг игрока. */
function cutAura(dark: HTMLCanvasElement, aura: { x: number; y: number }, work: HTMLCanvasElement): HTMLCanvasElement {
  const wctx = work.getContext('2d')!
  wctx.globalCompositeOperation = 'copy'
  wctx.drawImage(dark, 0, 0)
  wctx.globalCompositeOperation = 'destination-out'
  const sprite = auraSprite()
  wctx.drawImage(sprite, Math.round(aura.x - sprite.width / 2), Math.round(aura.y - sprite.height / 2))
  wctx.globalCompositeOperation = 'source-over'
  return work
}

/** Темнота в помещении, пока лампа не зажглась: почти ночь, видно только ореол вокруг игрока. */
const DARK_ROOM = 0.86

/** Темнота с неподвижным светом — попиксельно, один раз на карту и набор огней. darkness — ровная темнота вместо сумерек. */
function bakeDarkness(w: number, h: number, lights: Light[], darkness?: number): HTMLCanvasElement {
  const light = new Float32Array(w * h)
  // какой источник светит в пиксель сильнее всех — его цвет и даёт отсвет
  const strongest = new Float32Array(w * h)
  const owner = new Int16Array(w * h).fill(-1)
  lights.forEach((l, index) => addLight(light, w, h, l, strongest, owner, index))
  const image = new ImageData(w, h)
  const data = image.data
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = (x - w / 2) / (w / 2)
      const ny = (y - h * 0.45) / (h / 2)
      const edge = Math.min(1, Math.max(0, Math.hypot(nx * 0.85, ny) - 0.35) / 0.75)
      const ambient = darkness ?? AMBIENT_CENTER + (AMBIENT_EDGE - AMBIENT_CENTER) * edge * edge
      const i = y * w + x
      const lit = Math.min(1, light[i])
      const threshold = BAYER[(y & 3) * 4 + (x & 3)]
      // темнота: 5 ступеней, свет её съедает
      const dark = Math.floor(ambient * (1 - lit) * 4 + threshold) / 4
      const o = i * 4
      if (lit > 0.35 && Math.floor((lit - 0.35) * 3 + threshold) > 0) {
        const glow = owner[i] >= 0 ? (lights[owner[i]].color ?? LAMP_GLOW) : LAMP_GLOW
        // розовое свечение цветов чуть заметнее тёплого: лепестки светятся сами, а не отражают лампу
        data.set([glow[0], glow[1], glow[2], glow === LAMP_GLOW ? 34 : 64], o)
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
function addLight(
  target: Float32Array,
  w: number,
  h: number,
  l: Light,
  strongest?: Float32Array,
  owner?: Int16Array,
  index = -1,
) {
  const x0 = Math.max(0, Math.floor(l.x - l.radius))
  const x1 = Math.min(w - 1, Math.ceil(l.x + l.radius))
  const y0 = Math.max(0, Math.floor(l.y - l.radius))
  const y1 = Math.min(h - 1, Math.ceil(l.y + l.radius))
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - l.x, y - l.y) / l.radius
      if (d >= 1) continue
      const add = (1 - d) * (1 - d) * 1.6 * l.strength
      const i = y * w + x
      target[i] += add
      if (strongest && owner && add > strongest[i]) {
        strongest[i] = add
        owner[i] = index
      }
    }
}

/**
 * Кадр стоящего персонажа: редкое движение (мышь дёрнула ушами, качнула хвостом) раз в пару секунд.
 * Сдвиг по позиции — чтобы соседи не шевелились синхронно.
 */
function idleImage(c: CharacterSprite, time: number): CanvasImageSource {
  if (!c.idle || c.idle.length < 2) return c.image
  return (time + c.px * 37 + c.py * 11) % 2600 < 280 ? c.idle[1] : c.idle[0]
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

/**
 * Прополка: мотыга в руках у персонажа (со стороны грядки) и клочки сорняков, вылетающие из клетки.
 * Рисуется до света — анимация живёт в тех же сумерках, что и сад.
 */
function drawWeeding(ctx: CanvasRenderingContext2D, atlas: Atlas, effect: WeedEffect, t: number, player?: { x: number; y: number } | null) {
  const hoe = hoeFrame(t)
  if (hoe && player) {
    const targetX = effect.cell.x * TILE + TILE / 2
    const left = targetX < player.x - 4
    const x = Math.round(player.x + (left ? -18 : 2))
    const y = Math.round(player.y - 24)
    if (left) {
      ctx.save()
      ctx.translate(x + 16, y)
      ctx.scale(-1, 1)
      drawFrame(ctx, atlas, `fx_hoe_${hoe}`, 0, 0)
      ctx.restore()
    } else {
      drawFrame(ctx, atlas, `fx_hoe_${hoe}`, x, y)
    }
  }
  for (const p of weedParticles(effect, t)) {
    ctx.fillStyle = '#0e0b0a'
    ctx.fillRect(p.x - 1, p.y - 1, p.size + 2, p.size + 2) // контур, как у всех спрайтов
    ctx.fillStyle = p.color
    ctx.fillRect(p.x, p.y, p.size, p.size)
  }
}

/** Кадр постройки с учётом её состояния; если особого кадра нет — обычный. */
function propFrame(atlas: Atlas, kind: string, variant: string | null): string {
  const special = variant && `prop_${kind}_${variant}`
  return special && atlas.frames[special] ? special : `prop_${kind}`
}

function drawFrame(ctx: CanvasRenderingContext2D, atlas: Atlas, name: string, x: number, y: number) {
  const f = atlas.frames[name]
  if (!f) return // нет кадра — пропускаем, а не ломаем весь кадр сцены
  ctx.drawImage(atlas.image, f.x, f.y, f.w, f.h, x, y, f.w, f.h)
}
