import { apiFetch } from './client'
import type { Catalog, CompletionResult, GameState, GardenObject, Habit, HabitInput, PurchaseResult } from './types'

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
