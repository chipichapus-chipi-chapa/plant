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

export type TileType = { type: string; name: string; description: string; plantable: boolean }

export type GardenProp = {
  key: string
  kind: string
  x: number
  y: number
  width: number
  height: number
  name: string
  description: string
}

/** Карта сада: строки символов, легенда символов и постройки поверх тайлов */
export type GardenMap = {
  key: string
  name: string
  width: number
  height: number
  tiles: Record<string, TileType>
  rows: string[]
  props: GardenProp[]
}

/** Магический рецепт: ингредиенты пробуждают постройку с карты (targetObjectKey) */
export type Recipe = {
  key: string
  name: string
  description: string
  targetObjectKey: string
  resultText: string
  ingredients: ItemGrant[]
}

/** Уникальный коллекционный кристалл */
export type Artifact = {
  key: string
  name: string
  crystalCategory: string
  description: string
  legend: string
  acquisitionHint: string
  effectText: string
}

/** Слот внешности: STYLE — форма (кадр атласа), COLOR — цвет для перекраски */
export type AppearanceSlot = {
  key: string
  name: string
  kind: 'STYLE' | 'COLOR'
  options: { key: string; name: string; color: string | null }[]
}

export type Catalog = {
  appearance: AppearanceSlot[]
  crystals: CrystalCategory[]
  species: { key: string; name: string; stageMinutes: number[] }[]
  items: CatalogItem[]
  garden: GardenMap
  recipes: Recipe[]
  artifacts: Artifact[]
  /** Места находок: к какой постройке привязаны. Содержимое — секрет сервера. */
  spots: { key: string; propKey: string }[]
}

export type Habit = { id: number; title: string; crystalCategory: string | null; doneToday: boolean }

export type ItemGrant = { itemKey: string; quantity: number }

/** Растение (позже и декор) в клетке сада. Стадию роста считает сервер. */
export type GardenObject = {
  x: number
  y: number
  kind: 'PLANT'
  speciesKey: string
  plantedAt: string
  stage: number
  stageCount: number
  mature: boolean
  /** ISO-время следующей стадии; null — растение взрослое */
  nextStageAt: string | null
}

export type GameState = {
  player: {
    displayName: string
    timezone: string
    /** персонаж создан; иначе показываем окно «Новый садовник» */
    onboarded: boolean
    /** слот внешности → выбранный вариант */
    appearance: Record<string, string>
  }
  /** Дата «сегодня» по часовому поясу игрока, ISO yyyy-mm-dd */
  today: string
  inventory: ItemGrant[]
  habits: Habit[]
  dailyRewards: { used: number; limit: number }
  garden: { objects: GardenObject[] }
  /** Пробуждённые объекты мира; нет в списке — объект спит */
  worldObjects: { objectKey: string; state: 'AWAKENED' }[]
  /** Обысканные места находок */
  searchedSpots: string[]
  /** Коллекция: когда и где найден каждый артефакт */
  artifacts: { key: string; foundAt: string; foundWhere: string }[]
}

export type SearchResult = {
  spotKey: string
  /** FOUND — нашли; EMPTY — здесь уже всё найдено; LOCKED — пока не найти */
  outcome: 'FOUND' | 'EMPTY' | 'LOCKED'
  text: string
  reward: ItemGrant[]
  artifact: { key: string; name: string } | null
}

export type CastResult = {
  recipeKey: string
  objectKey: string
  state: 'AWAKENED'
  spent: ItemGrant[]
  resultText: string
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

/** Солнечные искры — редкий ресурс за значимые открытия */
export const SUN_SPARK = 'sun_spark'

export type PurchaseResult = {
  itemKey: string
  quantity: number
  /** сколько Семян жизни списано */
  cost: number
  /** true — повтор уже выполненной покупки, повторно ничего не списано */
  replayed: boolean
}

/** Месяц трекера привычек */
export type HabitHistory = {
  /** "yyyy-MM" */
  month: string
  daysInMonth: number
  /** сегодня по поясу игрока, yyyy-mm-dd: отметка за этот день — с наградой */
  today: string
  /** самый ранний день, который ещё можно отметить или снять */
  editableFrom: string
  habits: { id: number; title: string; crystalCategory: string | null; days: number[] }[]
}

export type DayCompletionResult = CompletionResult & { historyOnly: boolean }
