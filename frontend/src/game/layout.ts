// Чистая геометрия сада: какой кадр рисовать в клетке, что лежит в клетке,
// какая клетка под курсором. Без DOM — поэтому легко тестируется.

import type { GardenMap, GardenObject, GardenProp, TileType } from '../api/types'

export const TILE = 32

export type Cell = { x: number; y: number }

/** Где стоит персонаж игрока: на тропинке у двери сарая. */
export const PLAYER_SPOT: Cell = { x: 12, y: 4 }

/** Где стоит Мастер Вереск: на тропинке между грядками и чашей. */
export const MENTOR_SPOT: Cell = { x: 10, y: 5 }

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

/** Маска соседей того же типа: север=1, восток=2, юг=4, запад=8. */
export function neighbourMask(map: GardenMap, x: number, y: number, type: string): number {
  const same = (dx: number, dy: number) => tileAt(map, x + dx, y + dy)?.type === type
  return (same(0, -1) ? 1 : 0) | (same(1, 0) ? 2 : 0) | (same(0, 1) ? 4 : 0) | (same(-1, 0) ? 8 : 0)
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
      // калитка-тайл (в старых картах); в домашнем саду калитка — постройка
      return 'prop_gate'
    case 'weeds':
      return `weeds_${variant(x, y, 3)}`
    case 'path':
    case 'soil':
    case 'overgrown':
      // кадр по соседям того же типа: где соседа нет — трава наползает на тропу, у грядки бортик
      return `${type}_${neighbourMask(map, x, y, type)}`
    default:
      return `grass_${variant(x, y, 4)}`
  }
}

/** Клетка под точкой в CSS-пикселях канваса при данном масштабе. */
export function cellAtPoint(px: number, py: number, scale: number): Cell {
  return { x: Math.floor(px / (TILE * scale)), y: Math.floor(py / (TILE * scale)) }
}

/**
 * Масштаб сада под доступную ширину и высоту (не больше ×3, не меньше ×0.25).
 * Масштаб дробный: на обычном ноутбуке целый ×1 оставил бы сад крошечным, а ×2 не влез бы.
 * Сцена рисуется в буфер 1:1 и растягивается без сглаживания, поэтому пиксели остаются чёткими,
 * лишь часть из них на экранный пиксель шире соседних.
 */
export function fitScale(availableWidth: number, map: GardenMap, availableHeight = Infinity): number {
  const fit = Math.min(availableWidth / (map.width * TILE), availableHeight / (map.height * TILE))
  return Math.max(0.25, Math.min(3, fit))
}

/** Что показать игроку о клетке: постройка важнее тайла под ней. */
export function describeCell(map: GardenMap, cell: Cell): { name: string; description: string; plantable: boolean } | null {
  if (!inBounds(map, cell)) return null
  const prop = propAt(map, cell.x, cell.y)
  if (prop) return { name: prop.name, description: prop.description, plantable: false }
  const tile = tileAt(map, cell.x, cell.y)
  return tile ? { name: tile.name, description: tile.description, plantable: tile.plantable } : null
}

export function objectAt(objects: GardenObject[], cell: Cell): GardenObject | undefined {
  return objects.find((o) => o.x === cell.x && o.y === cell.y)
}

/** Через сколько минут следующая стадия (округляем вверх, минимум 1). null — растение взрослое. */
export function minutesUntilNextStage(object: GardenObject, now: number): number | null {
  if (!object.nextStageAt) return null
  return Math.max(1, Math.ceil((Date.parse(object.nextStageAt) - now) / 60_000))
}

/** Когда перечитать состояние, чтобы увидеть ближайшую смену стадии (мс от now), или null. */
export function nextGrowthRefresh(objects: GardenObject[], now: number): number | null {
  const times = objects.filter((o) => o.nextStageAt).map((o) => Date.parse(o.nextStageAt!))
  if (times.length === 0) return null
  return Math.max(1000, Math.min(...times) - now + 500)
}
