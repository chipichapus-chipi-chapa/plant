import { apiFetch } from './client'
import type { Catalog, CompletionResult, GameState, Habit, HabitInput } from './types'

export const fetchGameState = () => apiFetch<GameState>('/api/state')
export const fetchCatalog = () => apiFetch<Catalog>('/api/catalog')

export const createHabit = (input: HabitInput) =>
  apiFetch<Habit>('/api/habits', { method: 'POST', body: JSON.stringify(input) })

export const updateHabit = (id: number, input: HabitInput) =>
  apiFetch<Habit>(`/api/habits/${id}`, { method: 'PUT', body: JSON.stringify(input) })

export const archiveHabit = (id: number) => apiFetch<void>(`/api/habits/${id}`, { method: 'DELETE' })

export const completeHabitToday = (id: number) =>
  apiFetch<CompletionResult>(`/api/habits/${id}/completions/today`, { method: 'PUT' })
