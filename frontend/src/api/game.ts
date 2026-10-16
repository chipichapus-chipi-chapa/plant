import { apiFetch } from './client'
import type { AttemptResult, CastResult, Catalog, CompletionResult, DayCompletionResult, FinishDialogueResult, HabitHistory, GameState, GardenObject, Habit, HabitInput, PurchaseResult, SearchResult, WeedResult } from './types'

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

export const plantSeed = (x: number, y: number, seedItemKey: string) =>
  apiFetch<GardenObject>('/api/garden/plantings', { method: 'POST', body: JSON.stringify({ x, y, seedItemKey }) })

/** Прополоть заросшую грядку (нужны лопата и грабли в сумке) */
export const weedBed = (x: number, y: number) =>
  apiFetch<WeedResult>('/api/garden/weedings', { method: 'POST', body: JSON.stringify({ x, y }) })

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
