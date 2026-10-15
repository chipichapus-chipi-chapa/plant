import type { GardenMap, GardenObject } from '../api/types'
import type { Atlas } from './atlas'
import { TILE, tileFrame, type Cell } from './layout'

export type Highlights = { hover: Cell | null; selected: Cell | null }

/**
 * Рисует сад в логических пикселях (1 тайл = 32). Масштаб задаётся трансформацией контекста,
 * сглаживание выключено — пиксели остаются чёткими.
 * Порядок слоёв: земля → постройки и растения (сверху вниз, чтобы нижние перекрывали верхние) → подсветка.
 */
export function drawGarden(
  ctx: CanvasRenderingContext2D,
  map: GardenMap,
  objects: GardenObject[],
  atlas: Atlas,
  highlights: Highlights,
  awakened: ReadonlySet<string> = new Set(),
) {
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
  for (const sprite of sprites) {
    drawFrame(ctx, atlas, sprite.frame, sprite.x, sprite.y)
  }

  if (highlights.hover) drawCorners(ctx, highlights.hover, 'rgba(242, 227, 194, 0.85)')
  if (highlights.selected) drawSelection(ctx, highlights.selected)
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

/** Выбранная клетка: рамка цвета солнца с тёмной обводкой. */
function drawSelection(ctx: CanvasRenderingContext2D, cell: Cell) {
  const x = cell.x * TILE
  const y = cell.y * TILE
  ctx.fillStyle = '#241b13'
  ctx.fillRect(x - 1, y - 1, TILE + 2, 4)
  ctx.fillRect(x - 1, y + TILE - 3, TILE + 2, 4)
  ctx.fillRect(x - 1, y - 1, 4, TILE + 2)
  ctx.fillRect(x + TILE - 3, y - 1, 4, TILE + 2)
  ctx.fillStyle = '#f0c25a'
  ctx.fillRect(x, y, TILE, 2)
  ctx.fillRect(x, y + TILE - 2, TILE, 2)
  ctx.fillRect(x, y, 2, TILE)
  ctx.fillRect(x + TILE - 2, y, 2, TILE)
}
