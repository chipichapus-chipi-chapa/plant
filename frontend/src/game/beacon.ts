/**
 * Маяк на Ракушечном острове. Считает сервер — здесь только то, как он выглядит и звучит:
 * какие окна горят и каким цветом, горит ли фонарь наверху, какой разговор у Коры.
 */
import type { Catalog, GameState, GardenMap } from '../api/types'

type BeaconState = NonNullable<GameState['beacon']>

/** Окна маяка в пикселях постройки, снизу вверх, — по порядку кристаллов (как в атласе). */
export const LIGHTHOUSE_WINDOWS: readonly (readonly [number, number])[] = [[24, 106], [40, 92], [24, 78], [40, 64], [24, 50], [40, 36]]

/** Огней хватает: Кора может поблагодарить, фонарь наверху горит. */
export const beaconEnough = (beacon: GameState['beacon']) => !!beacon && beacon.started && beacon.lit.length >= beacon.needed

/** 0 — тёмный, 1 — окна загораются, 2 — огней хватает. */
export function beaconBand(beacon: BeaconState): 0 | 1 | 2 {
  if (beaconEnough(beacon)) return 2
  return beacon.started && beacon.lit.length > 0 ? 1 : 0
}

/** Горящие окна маяка на этой карте: точка в логических пикселях и цвет кристалла. */
export function beaconWindows(map: GardenMap, beacon: GameState['beacon'], catalog: Catalog): { x: number; y: number; color: string }[] {
  if (!beacon || beacon.map !== map.key) return []
  const prop = map.props.find((p) => p.key === beacon.prop)
  if (!prop) return []
  return catalog.crystals.flatMap((crystal, i) => {
    const spot = LIGHTHOUSE_WINDOWS[i]
    return spot && beacon.lit.includes(crystal.key) ? [{ x: prop.x * 32 + spot[0], y: prop.y * 32 + spot[1], color: crystal.color }] : []
  })
}

/** Разговор о маяке у смотрительницы или null; новость — сразу, дальше — через раз с остальными. */
export function beaconTalk(npcKey: string, map: GardenMap, beacon: GameState['beacon'], heardBand: number | null, coin: number): string | null {
  if (!map.beacon || map.beacon.speaker !== npcKey || !beacon) return null
  const band = beaconBand(beacon)
  if (heardBand === null || heardBand < band) return map.beacon.talks[band]
  return coin < 0.5 ? map.beacon.talks[band] : null
}
