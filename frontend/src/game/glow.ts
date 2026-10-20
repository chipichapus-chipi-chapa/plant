/**
 * Грибница в Грибной лощине. Считает сервер — здесь только то, как она выглядит и звучит:
 * сколько пятен горит на карте и какой разговор у Мха.
 */
import type { GameState, GardenMap } from '../api/types'

type GlowState = NonNullable<GameState['glow']>

/** Горит вся грибница: Мох может отдать её свет. */
export const glowLit = (glow: GameState['glow']) => !!glow && glow.started && glow.days >= glow.needed

/** 0 — тёмная, 1 — разгорается (хоть одно пятно), 2 — горит вся. */
export function glowBand(glow: GlowState): 0 | 1 | 2 {
  if (glowLit(glow)) return 2
  return glow.started && glow.days > 0 ? 1 : 0
}

/**
 * Карта с горящими пятнами: первые days клеток грибницы (по порядку чтения строк) становятся
 * клетками проснувшейся грибницы.
 */
export function withGlow(map: GardenMap, glow: GameState['glow']): GardenMap {
  if (!map.glow || !glow || glow.map !== map.key || glow.days <= 0) return map
  const sleeping = Object.entries(map.tiles).find(([, t]) => t.type === 'mycelium')?.[0]
  const lit = Object.entries(map.tiles).find(([, t]) => t.type === 'mycelium_lit')?.[0]
  if (!sleeping || !lit) return map
  let left = glow.days
  const rows = map.rows.map((row) =>
    [...row].map((c) => (c === sleeping && left > 0 ? (left--, lit) : c)).join(''),
  )
  return { ...map, rows }
}

/**
 * Разговор о грибнице у рассказчика (Мха) или null — тогда обычный разговор. Новость (загорелось первое
 * пятно, разгорелась вся) рассказывается сразу; дальше — через раз с остальными.
 */
export function glowTalk(npcKey: string, map: GardenMap, glow: GameState['glow'], heardBand: number | null, coin: number): string | null {
  if (!map.glow || map.glow.speaker !== npcKey || !glow) return null
  const band = glowBand(glow)
  if (heardBand === null || heardBand < band) return map.glow.talks[band]
  return coin < 0.5 ? map.glow.talks[band] : null
}
