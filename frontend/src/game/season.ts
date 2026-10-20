/**
 * Времена года в долине. Считает сервер (по неделе каждое) — здесь только то, как они выглядят:
 * снег и снежинки зимой, листопад осенью, лепестки весной, и где стоит теплица над грядками.
 */
import type { GameState, GardenMap } from '../api/types'

export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'AUTUMN'

export const SEASON_NAMES: Record<Season, string> = { WINTER: 'Зима', SPRING: 'Весна', SUMMER: 'Лето', AUTUMN: 'Осень' }

/** В помещении погоды нет: там, где есть стены. */
export const indoors = (map: GardenMap) => Object.values(map.tiles).some((t) => t.type === 'wall')

/** Сажать сейчас можно: тепло, или холодно, но это дом и теплица стоит. */
export function canPlantNow(state: GameState, map: GardenMap): boolean {
  const s = state.season
  return !s?.cold || (map.key === 'home' && s.greenhouse)
}

/**
 * Теплица над грядками домашнего сада — прямоугольник в логических пикселях вокруг всех грядок
 * (и заросших тоже), или null.
 */
export function greenhouseRect(map: GardenMap, state: GameState): { x: number; y: number; w: number; h: number } | null {
  if (map.key !== 'home' || !state.season?.cold || !state.season.greenhouse) return null
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -1
  let y1 = -1
  map.rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      const t = map.tiles[c]
      if (t && (t.plantable || t.type === 'overgrown')) {
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
    }),
  )
  if (x1 < 0) return null
  return { x: x0 * 32 - 4, y: y0 * 32 - 14, w: (x1 - x0 + 1) * 32 + 8, h: (y1 - y0 + 1) * 32 + 18 }
}
