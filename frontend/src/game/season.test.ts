import { describe, expect, it } from 'vitest'
import type { GameState, GardenMap } from '../api/types'
import { canPlantNow, greenhouseRect } from './season'

const home = {
  key: 'home',
  tiles: { '.': { type: 'grass', plantable: false }, s: { type: 'soil', plantable: true }, S: { type: 'overgrown', plantable: false } },
  rows: ['....', '.SS.', '.ss.'],
} as unknown as GardenMap
const town = { ...home, key: 'town' } as GardenMap
const state = (season: GameState['season']) => ({ season }) as GameState

describe('времена года', () => {
  it('зимой сажают только в теплице у дома', () => {
    expect(canPlantNow(state({ season: 'AUTUMN', cold: false, greenhouse: false }), town)).toBe(true)
    expect(canPlantNow(state({ season: 'WINTER', cold: true, greenhouse: false }), home)).toBe(false)
    expect(canPlantNow(state({ season: 'WINTER', cold: true, greenhouse: true }), home)).toBe(true)
    expect(canPlantNow(state({ season: 'WINTER', cold: true, greenhouse: true }), town)).toBe(false)
  })

  it('теплица накрывает все грядки, а весной её нет', () => {
    expect(greenhouseRect(home, state({ season: 'WINTER', cold: true, greenhouse: true }))).toEqual({ x: 28, y: 18, w: 72, h: 82 })
    expect(greenhouseRect(home, state({ season: 'SPRING', cold: false, greenhouse: false }))).toBeNull()
  })
})
