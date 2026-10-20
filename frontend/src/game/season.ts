/**
 * Времена года в долине. Считает сервер (по неделе каждое) — здесь только то, как они выглядят:
 * снег и снежинки зимой, листопад осенью, лепестки весной, и где стоит теплица над грядками.
 */
import type { GameState, GardenMap } from '../api/types'

export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'AUTUMN'

export const SEASON_NAMES: Record<Season, string> = { WINTER: 'Зима', SPRING: 'Весна', SUMMER: 'Лето', AUTUMN: 'Осень' }

/** В помещении погоды нет: там, где есть стены. */
export const indoors = (map: GardenMap) => Object.values(map.tiles).some((t) => t.type === 'wall')

/**
 * Грядка целиком: связный участок клеток-грядок (и заросших) вокруг клетки, как считает сервер.
 * Первая клетка (верхняя левая) — якорь, по нему узнают теплицу над участком.
 */
export function bedAround(map: GardenMap, cell: { x: number; y: number }): { x: number; y: number }[] {
  const isBed = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false
    if (map.props.some((p) => x >= p.x && x < p.x + p.width && y >= p.y && y < p.y + p.height)) return false
    const t = map.tiles[map.rows[y]?.[x] ?? '']
    return !!t && (t.plantable || t.type === 'overgrown')
  }
  if (!isBed(cell.x, cell.y)) return []
  const seen = new Set([`${cell.x},${cell.y}`])
  const queue = [cell]
  const cells: { x: number; y: number }[] = []
  while (queue.length) {
    const c = queue.shift()!
    cells.push(c)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: c.x + dx, y: c.y + dy }
      if (isBed(n.x, n.y) && !seen.has(`${n.x},${n.y}`)) {
        seen.add(`${n.x},${n.y}`)
        queue.push(n)
      }
    }
  }
  return cells.sort((a, b) => a.y - b.y || a.x - b.x)
}

/** Теплица на карте: прямоугольник участка в клетках и столбец дверцы (в нижней стенке). */
export type Greenhouse = { x: number; y: number; w: number; h: number; door: number }

/**
 * Где у теплицы дверца: в нижней стенке, ближе к середине — там, где под ней можно встать
 * (не камни, не постройка, не забор). При равенстве — правее.
 */
function doorColumn(map: GardenMap, g: { x: number; y: number; w: number; h: number }): number {
  const below = g.y + g.h
  const free = (x: number) => {
    if (below >= map.height) return false
    if (map.props.some((p) => x >= p.x && x < p.x + p.width && below >= p.y && below < p.y + p.height)) return false
    const t = map.tiles[map.rows[below]?.[x] ?? '']
    return !!t && !['forest', 'fence', 'wall', 'water', 'reeds'].includes(t.type)
  }
  const mid = g.x + Math.floor(g.w / 2)
  for (let d = 0; d < g.w; d++) {
    for (const x of d === 0 ? [mid] : [mid + d, mid - d]) if (x >= g.x && x < g.x + g.w && free(x)) return x
  }
  return mid
}

/** Теплицы на этой карте (зимой): прямоугольник участка в клетках и дверца. */
export function greenhousesOn(state: GameState, map: GardenMap): Greenhouse[] {
  if (!state.season?.cold) return []
  return state.season.greenhouses
    .filter((g) => g.gardenKey === map.key)
    .flatMap((g) => {
      const cells = bedAround(map, g)
      if (!cells.length) return []
      const xs = cells.map((c) => c.x)
      const ys = cells.map((c) => c.y)
      const x = Math.min(...xs)
      const y = Math.min(...ys)
      const rect = { x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1 }
      return [{ ...rect, door: doorColumn(map, rect) }]
    })
}

/** Сажать в эту грядку сейчас можно: тепло, или зима, но над её участком стоит теплица. */
export function canPlantNow(state: GameState, map: GardenMap, cell: { x: number; y: number }): boolean {
  if (!state.season?.cold) return true
  const anchor = bedAround(map, cell)[0]
  return !!anchor && state.season.greenhouses.some((g) => g.gardenKey === map.key && g.x === anchor.x && g.y === anchor.y)
}
