import { apiFetch } from './client'
import type { AttemptResult, CastResult, ErrandResult, Catalog, CompletionResult, DayCompletionResult, FinishDialogueResult, HabitHistory, GameState, GardenObject, Habit, HabitInput, PurchaseResult, SearchResult, WeedResult, ItemGrant } from './types'

export const fetchGameState = () => apiFetch<GameState>('/api/state')
export const fetchCatalog = () => apiFetch<Catalog>('/api/catalog')

export const createHabit = (input: HabitInput) =>
  apiFetch<Habit>('/api/habits', { method: 'POST', body: JSON.stringify(input) })

export const updateHabit = (id: number, input: HabitInput) =>
  apiFetch<Habit>(`/api/habits/${id}`, { method: 'PUT', body: JSON.stringify(input) })

export const archiveHabit = (id: number) => apiFetch<void>(`/api/habits/${id}`, { method: 'DELETE' })

export const completeHabitToday = (id: number) =>
  apiFetch<CompletionResult>(`/api/habits/${id}/completions/today`, { method: 'PUT' })

/** idempotencyKey создаётся один раз на намерение купить и переиспользуется при повторе после сбоя сети */
export const purchaseItem = (itemKey: string, quantity: number, idempotencyKey: string) =>
  apiFetch<PurchaseResult>('/api/shop/purchases', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ itemKey, quantity }),
  })

export const plantSeed = (gardenKey: string, x: number, y: number, seedItemKey: string) =>
  apiFetch<GardenObject>('/api/garden/plantings', { method: 'POST', body: JSON.stringify({ gardenKey, x, y, seedItemKey }) })

/** Собрать взрослое растение: урожай — в сумку, грядка освобождается */
export const harvestPlant = (gardenKey: string, x: number, y: number) =>
  apiFetch<{ itemKey: string; quantity: number }>('/api/garden/harvests', { method: 'POST', body: JSON.stringify({ gardenKey, x, y }) })

/** Подарить жителю урожай из сумки (раз в день каждому) */
export const giveGift = (npcKey: string, itemKey: string) =>
  apiFetch<{ loved: boolean; talk: string | null; reward: { itemKey: string; quantity: number }[] }>(`/api/npcs/${npcKey}/gifts`, {
    method: 'POST',
    body: JSON.stringify({ itemKey }),
  })

/** Прополоть заросшую грядку (нужны лопата и грабли в сумке) */
export const weedBed = (x: number, y: number) =>
  apiFetch<WeedResult>('/api/garden/weedings', { method: 'POST', body: JSON.stringify({ x, y }) })

/** Житель попросил — поручение взято */
export const acceptErrand = (key: string) => apiFetch<unknown>(`/api/errands/${key}/accept`, { method: 'POST' })

/** Выполнить поручение: отдать вещи или показать находку */
export const completeErrand = (key: string) => apiFetch<ErrandResult>(`/api/errands/${key}/complete`, { method: 'POST' })

/** Попробовать открыть замок: неверная комбинация ничего не стоит */
export const attemptPuzzle = (puzzleKey: string, answer: string[]) =>
  apiFetch<AttemptResult>(`/api/puzzles/${puzzleKey}/attempts`, { method: 'POST', body: JSON.stringify({ answer }) })

export const castRecipe = (recipeKey: string) =>
  apiFetch<CastResult>(`/api/magic/recipes/${recipeKey}/cast`, { method: 'POST' })

export const fetchHabitHistory = (month?: string) =>
  apiFetch<HabitHistory>(`/api/habits/history${month ? `?month=${month}` : ''}`)

/** Отметка за день: сегодня — с наградой, прошлые дни — запись без награды */
export const completeHabitOn = (id: number, day: string) =>
  apiFetch<DayCompletionResult>(`/api/habits/${id}/completions/${day}`, { method: 'PUT' })

export const uncompleteHabitOn = (id: number, day: string) =>
  apiFetch<void>(`/api/habits/${id}/completions/${day}`, { method: 'DELETE' })

export const searchSpot = (spotKey: string) =>
  apiFetch<SearchResult>(`/api/exploration/spots/${spotKey}/search`, { method: 'POST' })

export const saveProfile = (displayName: string, appearance: Record<string, string>) =>
  apiFetch<void>('/api/profile', { method: 'PUT', body: JSON.stringify({ displayName, appearance }) })

/** Разговор дочитан: сервер ставит флаг и (один раз) выдаёт подарок */
export const finishDialogue = (key: string) =>
  apiFetch<FinishDialogueResult>(`/api/mentor/dialogues/${key}/finish`, { method: 'POST' })

/** Кнопки тестирования (только для тестировщиков): ресурсы, все тропы, туман, новая игра */
export type TestAction = 'resources' | 'open-paths' | 'fog-day' | 'fog-clear' | 'bread-day' | 'beacon-window' | 'night' | 'reset'
export const runTestAction = (action: TestAction) => apiFetch<void>(`/api/test/${action}`, { method: 'POST' })

/** Испечь субботний каравай у Агаты: Семена жизни по числу дней недели с привычками */
export const bakeBread = () => apiFetch<{ days: number; reward: ItemGrant[] }>('/api/story/bread', { method: 'POST' })
