// Текущие задания игрока: от Вереска, поручения жителей и туман над озером (окно «Задания»).
import type { Catalog, GameState, Npc } from '../api/types'
import { fogCleared } from './fog'
import type { Objective } from './guidance'

export type Quests = {
  objective: Objective | null
  /** Поручения жителей, которые взяты и ещё не выполнены */
  errands: Npc[]
  /** Туман над озером, пока он редеет; рассказчик — житель, который о нём говорит */
  fog: { teller: Npc; days: number; needed: number } | null
  /** Субботний хлеб у Агаты — когда она дома и печь горит */
  bread: { baker: Npc; ready: boolean; baked: boolean; days: number; loaf: number } | null
}

/** Все текущие задания: от Вереска, поручения жителей и туман над озером. */
export function activeQuests(objective: Objective | null, state: GameState, catalog: Catalog): Quests {
  const errands = catalog.locations
    .flatMap((l) => l.npcs ?? [])
    .filter((n) => n.errand && state.errands.some((e) => e.key === n.errand!.key && e.offered && !e.done))
  const fogMap = catalog.locations.find((l) => l.fog && l.key === state.fog?.map)
  const teller = fogMap?.npcs?.find((n) => n.key === fogMap.fog?.speaker)
  const fog = state.fog?.started && !fogCleared(state.fog) && teller ? { teller, days: state.fog.days, needed: state.fog.needed } : null
  const bakeryMap = catalog.locations.find((l) => l.bread)
  const baker = bakeryMap?.npcs?.find((n) => n.key === bakeryMap.bread?.npc)
  const b = state.bread
  const bread = b?.home && baker ? { baker, ready: b.today && !b.baked, baked: b.baked, days: b.days, loaf: b.loaf } : null
  return { objective, errands, fog, bread }
}

// хлеб — постоянное дело; в счётчике он, только когда каравай готов (суббота)
export const questCount = (q: Quests) => (q.objective ? 1 : 0) + q.errands.length + (q.fog ? 1 : 0) + (q.bread?.ready ? 1 : 0)

