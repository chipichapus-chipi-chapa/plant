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
}

/** Все текущие задания: от Вереска, поручения жителей и туман над озером. */
export function activeQuests(objective: Objective | null, state: GameState, catalog: Catalog): Quests {
  const errands = catalog.locations
    .flatMap((l) => l.npcs ?? [])
    .filter((n) => n.errand && state.errands.some((e) => e.key === n.errand!.key && e.offered && !e.done))
  const fogMap = catalog.locations.find((l) => l.fog && l.key === state.fog?.map)
  const teller = fogMap?.npcs?.find((n) => n.key === fogMap.fog?.speaker)
  const fog = state.fog?.started && !fogCleared(state.fog) && teller ? { teller, days: state.fog.days, needed: state.fog.needed } : null
  return { objective, errands, fog }
}

export const questCount = (q: Quests) => (q.objective ? 1 : 0) + q.errands.length + (q.fog ? 1 : 0)

