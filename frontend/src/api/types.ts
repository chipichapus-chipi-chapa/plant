// Формы ответов backend. Держим их рядом с клиентом и меняем вместе с API.

export type ItemKind = 'CURRENCY' | 'SHARD' | 'SEED' | 'DECOR' | 'TOOL'

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
  /** Дверь в другую локацию */
  door?: Door | null
  /** Текст, который можно прочитать (письмо) */
  read?: string | null
}

/** Дверь: на какую карту, в какую клетку и куда персонаж будет смотреть; label — надпись на кнопке */
export type Door = { map: string; x: number; y: number; facing: 'up' | 'down' | 'left' | 'right'; label: string }

/** Карта локации (сад, сарай изнутри): строки символов, легенда символов и постройки поверх тайлов */
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
  /** Надпись на кнопке: «Пробудить», «Починить»… */
  actionLabel: string
  ingredients: ItemGrant[]
}

/** Замок с колёсиками. Правильную комбинацию знает только сервер. */
export type Puzzle = { key: string; propKey: string; prompt: string; dials: number; symbols: { key: string; name: string }[] }

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

/** Реплика: либо next (null — конец разговора), либо варианты ответа */
export type DialogueNode = { text: string; next: string | null; choices: { text: string; next: string }[] | null }

export type Dialogue = { start: string; onEnd: string | null; gift: ItemGrant[] | null; nodes: Record<string, DialogueNode> }

/** Реплики наставника и обучение — контент с сервера */
/** Цель стрелки шага: кнопка панели, постройка карты или тип клетки — задано ровно одно */
export type TutorialTarget = { hud: string | null; prop: string | null; tile: string | null }

export type MentorContent = {
  speaker: { key: string; name: string }
  intro: string
  idle: string[]
  dialogues: Record<string, Dialogue>
  /** offer — разговор, в котором Вереск сам даёт поручение */
  tutorial: { key: string; goal: string; target: TutorialTarget; offer: string | null }[]
  /** строка задания до знакомства, после выполненного шага и когда Вереск хочет дать поручение */
  meetGoal: string
  reportGoal: string
  offerGoal: string | null
}

export type Catalog = {
  mentor: MentorContent
  appearance: AppearanceSlot[]
  crystals: CrystalCategory[]
  species: { key: string; name: string; stageMinutes: number[] }[]
  items: CatalogItem[]
  /** Домашний сад (он же первая из locations) */
  garden: GardenMap
  /** Все локации: сад, сарай изнутри… */
  locations: GardenMap[]
  puzzles: Puzzle[]
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
  /** Что растёт в саду и какие заросшие грядки уже прополоты (стали обычными) */
  garden: { objects: GardenObject[]; weeded: { x: number; y: number }[] }
  /** Разгаданные загадки */
  solvedPuzzles: string[]
  /** Пробуждённые объекты мира; нет в списке — объект спит */
  worldObjects: { objectKey: string; state: 'AWAKENED' }[]
  /** Обысканные места находок */
  searchedSpots: string[]
  /** Коллекция: когда и где найден каждый артефакт */
  artifacts: { key: string; foundAt: string; foundWhere: string }[]
  /** Что наставник скажет при следующем разговоре; null — только случайные фразы */
  mentor: {
    nextDialogue: string | null
    /** над наставником горит «!» — знакомство, поручение или выполненный шаг */
    hasNews: boolean
    /** offered — поручение уже дано (у шагов без поручения всегда true) */
    steps: { key: string; done: boolean; acknowledged: boolean; offered: boolean }[]
  }
}

export type FinishDialogueResult = { dialogueKey: string; flag: string | null; gift: ItemGrant[] }

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

/** Итог прополки: сколько заросших клеток осталось */
export type WeedResult = { x: number; y: number; remaining: number }

/** Итог попытки открыть замок: solved — открыт (сейчас или раньше), reward — что получено этой попыткой */
export type AttemptResult = { puzzleKey: string; solved: boolean; text: string; reward: ItemGrant[] }
