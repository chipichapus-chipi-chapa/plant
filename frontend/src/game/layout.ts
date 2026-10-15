// Чистая геометрия сада: какой кадр рисовать в клетке, что лежит в клетке,
// какая клетка под курсором. Без DOM — поэтому легко тестируется.

import type { GardenMap, GardenProp, TileType } from '../api/types'

export const TILE = 32

export type Cell = { x: number; y: number }

export function tileAt(map: GardenMap, x: number, y: number): TileType | undefined {
  return map.tiles[map.rows[y]?.[x] ?? '']
}

export function inBounds(map: GardenMap, cell: Cell): boolean {
  return cell.x >= 0 && cell.y >= 0 && cell.x < map.width && cell.y < map.height
}

/** Постройка, которая накрывает клетку (если есть). */
export function propAt(map: GardenMap, x: number, y: number): GardenProp | undefined {
  return map.props.find((p) => x >= p.x && y >= p.y && x < p.x + p.width && y < p.y + p.height)
}

/** Стабильный «случайный» номер варианта для клетки: один и тот же при каждой отрисовке. */
export function variant(x: number, y: number, count: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) % count
}

const isFence = (map: GardenMap, x: number, y: number) => {
  const type = tileAt(map, x, y)?.type
  return type === 'fence' || type === 'gate'
}

/** Кадр атласа для клетки. Забор выбирает кусок по соседям: горизонтальный, вертикальный или столб в углу. */
export function tileFrame(map: GardenMap, x: number, y: number): string {
  const type = tileAt(map, x, y)?.type ?? 'grass'
  switch (type) {
    case 'fence': {
      const horizontal = isFence(map, x - 1, y) || isFence(map, x + 1, y)
      const vertical = isFence(map, x, y - 1) || isFence(map, x, y + 1)
      if (horizontal && vertical) return 'fence_post'
      return horizontal ? 'fence_h' : 'fence_v'
    }
    case 'gate':
      return 'gate'
    case 'weeds':
      return `weeds_${variant(x, y, 3)}`
    case 'path':
      return `path_${variant(x, y, 2)}`
    case 'soil':
      return `soil_${variant(x, y, 2)}`
    case 'overgrown':
      return `overgrown_${variant(x, y, 2)}`
    default:
      return `grass_${variant(x, y, 4)}`
  }
}

/** Клетка под точкой в CSS-пикселях канваса при данном масштабе. */
export function cellAtPoint(px: number, py: number, scale: number): Cell {
  return { x: Math.floor(px / (TILE * scale)), y: Math.floor(py / (TILE * scale)) }
}

/**
 * Масштаб сада под доступную ширину. Если влезает хотя бы ×1 — берём наибольший целый (до ×3),
 * чтобы пиксели были ровными. На узких экранах (телефон) — дробный: чуть неровные пиксели
 * лучше горизонтальной прокрутки.
 */
export function fitScale(availableWidth: number, map: GardenMap): number {
  const fit = availableWidth / (map.width * TILE)
  if (fit >= 1) return Math.min(3, Math.floor(fit))
  return Math.max(0.25, fit)
}

/** Что показать игроку о клетке: постройка важнее тайла под ней. */
export function describeCell(map: GardenMap, cell: Cell): { name: string; description: string; plantable: boolean } | null {
  if (!inBounds(map, cell)) return null
  const prop = propAt(map, cell.x, cell.y)
  if (prop) return { name: prop.name, description: prop.description, plantable: false }
  const tile = tileAt(map, cell.x, cell.y)
  return tile ? { name: tile.name, description: tile.description, plantable: tile.plantable } : null
}
