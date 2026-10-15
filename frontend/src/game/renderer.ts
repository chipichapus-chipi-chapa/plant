import type { GardenMap, GardenObject } from '../api/types'
import type { Atlas } from './atlas'
import { TILE, tileFrame, type Cell } from './layout'

export const CHARACTER_HEIGHT = 56

export type Highlights = { hover: Cell | null }

/**
 * Персонаж: готовая картинка 32×56 и точка его ступней в логических пикселях.
 * flip — смотрит влево (спрайт нарисован вполоборота вправо), lift — подпрыгивание при ходьбе.
 */
export type CharacterSprite = { px: number; py: number; image: CanvasImageSource; flip?: boolean; lift?: number }

/** Персонаж, стоящий в клетке: ступни по центру у нижнего края. */
export function standingAt(cell: Cell, image: CanvasImageSource): CharacterSprite {
  return { px: cell.x * TILE + TILE / 2, py: cell.y * TILE + TILE - 2, image }
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
  /** Время в мс — для покачивания стрелки */
  time?: number
}

/**
 * Рисует сад в логических пикселях (1 тайл = 32). Масштаб задаётся трансформацией контекста,
 * сглаживание выключено — пиксели остаются чёткими.
 * Порядок слоёв: земля → постройки и растения (сверху вниз, чтобы нижние перекрывали верхние) → подсветка.
 */
export function drawGarden(
  ctx: CanvasRenderingContext2D,
  map: GardenMap,
  atlas: Atlas,
  scene: Scene,
  highlights: Highlights,
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

  // Мерцание над постройками, где ещё что-то спрятано: подсказка «здесь стоит поискать»
  for (const prop of map.props) {
    if (sparkles.has(prop.key)) {
      drawFrame(ctx, atlas, 'fx_sparkle', (prop.x + prop.width) * TILE - 10, prop.y * TILE + 1)
    }
  }

  drawEveningLight(ctx, map)

  // «!» рисуем после света, чтобы облачко не тонуло в вечерних тенях
  for (const cell of bubbles) {
    drawFrame(ctx, atlas, 'fx_bubble', cell.x * TILE + 18, cell.y * TILE - (CHARACTER_HEIGHT - TILE) + 2)
  }

  if (prompt) drawFrame(ctx, atlas, 'fx_interact', Math.round(prompt.x - 5), Math.round(prompt.y - 15))
  if (marker) {
    const bob = Math.round(Math.sin(time / 220) * 2)
    drawFrame(ctx, atlas, 'fx_arrow', Math.round(marker.x - 6), Math.round(marker.y - 13 + bob))
  }

  // Лёгкие уголки под мышью — подсказка, куда придётся клик. Выбор клетки отдельно не рисуется.
  if (highlights.hover) drawCorners(ctx, highlights.hover, 'rgba(242, 227, 194, 0.7)')
}

/**
 * «Ламповый» вечерний свет поверх сцены: тёплая подкраска и мягкое затемнение к краям.
 * Рисуется до подсветки клеток, чтобы рамки выбора оставались чёткими.
 */
function drawEveningLight(ctx: CanvasRenderingContext2D, map: GardenMap) {
  const w = map.width * TILE
  const h = map.height * TILE
  ctx.save()
  ctx.globalCompositeOperation = 'soft-light'
  ctx.fillStyle = 'rgba(255, 176, 96, 0.35)'
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
  const vignette = ctx.createRadialGradient(w * 0.55, h * 0.4, h * 0.25, w / 2, h / 2, w * 0.62)
  vignette.addColorStop(0, 'rgba(255, 207, 122, 0.06)')
  vignette.addColorStop(0.6, 'rgba(36, 27, 19, 0)')
  vignette.addColorStop(1, 'rgba(36, 27, 19, 0.38)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

function drawCharacter(ctx: CanvasRenderingContext2D, c: CharacterSprite) {
  const left = Math.round(c.px - TILE / 2)
  const top = Math.round(c.py - CHARACTER_HEIGHT + 2 - (c.lift ?? 0))
  if (!c.flip) {
    ctx.drawImage(c.image, left, top)
    return
  }
  ctx.save()
  ctx.translate(left + TILE, top)
  ctx.scale(-1, 1)
  ctx.drawImage(c.image, 0, 0)
  ctx.restore()
}

function drawFrame(ctx: CanvasRenderingContext2D, atlas: Atlas, name: string, x: number, y: number) {
  const f = atlas.frames[name]
  if (!f) return // нет кадра — пропускаем, а не ломаем весь кадр сцены
  ctx.drawImage(atlas.image, f.x, f.y, f.w, f.h, x, y, f.w, f.h)
}

/** Наведение: четыре уголка, как прицел. Не закрывает тайл целиком. */
function drawCorners(ctx: CanvasRenderingContext2D, cell: Cell, color: string) {
  const x = cell.x * TILE
  const y = cell.y * TILE
  const l = 6
  ctx.fillStyle = color
  for (const [cx, cy, dx, dy] of [
    [x, y, 1, 1],
    [x + TILE, y, -1, 1],
    [x, y + TILE, 1, -1],
    [x + TILE, y + TILE, -1, -1],
  ]) {
    ctx.fillRect(dx > 0 ? cx : cx - l, dy > 0 ? cy : cy - 2, l, 2)
    ctx.fillRect(dx > 0 ? cx : cx - 2, dy > 0 ? cy : cy - l, 2, l)
  }
}
