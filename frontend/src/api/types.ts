// Формы ответов backend. Держим их рядом с клиентом и меняем вместе с API.

export type ItemKind = 'CURRENCY' | 'SHARD' | 'SEED' | 'DECOR'

export type CrystalCategory = { key: string; name: string; color: string; meaning: string }

export type CatalogItem = {
  key: string
  kind: ItemKind
  name: string
  description: string
  price: number | null
  speciesKey: string | null
  crystalCategory: string | null
}

export type Catalog = {
  crystals: CrystalCategory[]
  species: { key: string; name: string; stageMinutes: number[] }[]
  items: CatalogItem[]
}

export type Habit = { id: number; title: string; crystalCategory: string | null; doneToday: boolean }

export type ItemGrant = { itemKey: string; quantity: number }

export type GameState = {
  player: { displayName: string; timezone: string }
  /** Дата «сегодня» по часовому поясу игрока, ISO yyyy-mm-dd */
  today: string
  inventory: ItemGrant[]
  habits: Habit[]
  dailyRewards: { used: number; limit: number }
}

export type HabitInput = { title: string; crystalCategory: string | null }

export type CompletionResult = {
  habitId: number
  day: string
  /** false — привычка уже была отмечена сегодня, ничего не начислено */
  newlyCompleted: boolean
  reward: ItemGrant[]
  /** отметка засчитана, но дневной лимит наград исчерпан */
  dailyLimitReached: boolean
}

/** Ключ основной валюты в каталоге */
export const LIFE_SEED = 'life_seed'

export type PurchaseResult = {
  itemKey: string
  quantity: number
  /** сколько Семян жизни списано */
  cost: number
  /** true — повтор уже выполненной покупки, повторно ничего не списано */
  replayed: boolean
}
