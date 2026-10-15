import { apiFetch } from './client'
import type { Catalog, GameState } from './types'

export const fetchGameState = () => apiFetch<GameState>('/api/state')
export const fetchCatalog = () => apiFetch<Catalog>('/api/catalog')
