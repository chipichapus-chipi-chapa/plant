/**
 * Туман над озером (вторая глава). Считает сервер — здесь только то, как туман выглядит и звучит:
 * насколько он густой на карте, какой разговор у Тиши и сколько зарубок на причале.
 */
import type { GameState, GardenMap } from '../api/types'

type FogState = NonNullable<GameState['fog']>

/** Туман рассеялся: можно садиться в лодку. */
export const fogCleared = (fog: GameState['fog']) => !!fog && fog.started && fog.days >= fog.needed

/**
 * Густота тумана над локацией: 1 — сплошной, 0 — нет. Пока сад поместья спит, туман сплошной;
 * дальше редеет с каждым днём-возвращением, но лёгкая дымка у воды остаётся почти до конца.
 */
export function fogDensity(fog: GameState['fog'], mapKey: string): number {
  if (!fog || fog.map !== mapKey) return 0
  if (!fog.started) return 1
  return Math.max(0, 1 - fog.days / fog.needed)
}

/** 0 — густой, 1 — редеет (половина пути пройдена), 2 — рассеялся. */
export function fogBand(fog: FogState): 0 | 1 | 2 {
  if (fogCleared(fog)) return 2
  return fog.started && fog.days * 2 >= fog.needed ? 1 : 0
}

/**
 * Разговор о тумане у рассказчика (Тиши) или null — тогда обычный разговор. Новость (туман поредел,
 * рассеялся) рассказывается сразу, как только её ещё не слышали; дальше — через раз с остальными.
 */
export function fogTalk(npcKey: string, map: GardenMap, fog: GameState['fog'], heardBand: number | null, coin: number): string | null {
  if (!map.fog || map.fog.speaker !== npcKey || !fog?.started) return null
  const band = fogBand(fog)
  if (heardBand === null || heardBand < band) return map.fog.talks[band]
  return coin < 0.5 ? map.fog.talks[band] : null
}

/** Строчка про зарубки — к тексту причала: по одной за каждый день, когда вы вернулись. */
export function notchesLine(propKey: string, map: GardenMap, fog: GameState['fog']): string | null {
  if (!map.fog || map.fog.notches !== propKey || !fog?.started) return null
  if (fogCleared(fog)) return `Новых зарубок — ${fog.needed}. Под последней кто-то вырезал маленькую лодку.`
  return `Новых зарубок, с тех пор как ожил сад: ${fog.days} из ${fog.needed}.`
}
