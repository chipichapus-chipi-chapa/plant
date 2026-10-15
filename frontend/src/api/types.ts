// Формы ответов backend. Держим их рядом с клиентом и меняем вместе с API.

export type ItemKind = 'SEED' | 'DECOR'

export type Catalog = {
  species: { key: string; name: string; stageMinutes: number[] }[]
  items: {
    key: string
    kind: ItemKind
    name: string
    description: string
    price: number | null
    speciesKey: string | null
  }[]
}

export type GameState = {
  player: { displayName: string; coins: number; timezone: string }
  /** Дата «сегодня» по часовому поясу игрока, ISO yyyy-mm-dd */
  today: string
  inventory: { itemKey: string; quantity: number }[]
}
