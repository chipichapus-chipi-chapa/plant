/**
 * Времена года в долине. Считает сервер (по неделе каждое) — здесь только то, как они выглядят:
 * снег и снежинки зимой, листопад осенью, лепестки весной, и где стоит теплица над грядками.
 */
import type { GameState, GardenMap } from '../api/types'

export type Season = 'WINTER' | 'SPRING' | 'SUMMER' | 'AUTUMN'

export const SEASON_NAMES: Record<Season, string> = { WINTER: 'Зима', SPRING: 'Весна', SUMMER: 'Лето', AUTUMN: 'Осень' }

/** В помещении погоды нет: там, где есть стены. */
export const indoors = (map: GardenMap) => Object.values(map.tiles).some((t) => t.type === 'wall')

/** Грядки под теплицами на этой карте (зимой). */
export function greenhousesOn(state: GameState, map: GardenMap): { x: number; y: number }[] {
  if (!state.season?.cold) return []
  return state.season.greenhouses.filter((g) => g.gardenKey === map.key)
}

/** Сажать в эту грядку сейчас можно: тепло, или зима, но над грядкой стоит теплица. */
export function canPlantNow(state: GameState, map: GardenMap, cell: { x: number; y: number }): boolean {
  return !state.season?.cold || greenhousesOn(state, map).some((g) => g.x === cell.x && g.y === cell.y)
}
