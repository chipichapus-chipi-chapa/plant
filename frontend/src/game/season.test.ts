import { describe, expect, it } from 'vitest'
import type { GameState, GardenMap } from '../api/types'
import { canPlantNow, greenhousesOn } from './season'

const home = { key: 'home' } as GardenMap
const town = { key: 'town' } as GardenMap
const winter = { season: { season: 'WINTER', cold: true, greenhouses: [{ gardenKey: 'home', x: 3, y: 5 }], endsAt: '', wound: false } } as unknown as GameState
const autumn = { season: { season: 'AUTUMN', cold: false, greenhouses: [], endsAt: '', wound: false } } as unknown as GameState

describe('времена года', () => {
  it('зимой сажают только под теплицей над этой грядкой', () => {
    expect(canPlantNow(autumn, town, { x: 1, y: 1 })).toBe(true)
    expect(canPlantNow(winter, home, { x: 3, y: 5 })).toBe(true)
    expect(canPlantNow(winter, home, { x: 4, y: 5 })).toBe(false)
    expect(canPlantNow(winter, town, { x: 3, y: 5 })).toBe(false)
  })

  it('теплицы стоят только зимой и на своей карте', () => {
    expect(greenhousesOn(winter, home)).toEqual([{ gardenKey: 'home', x: 3, y: 5 }])
    expect(greenhousesOn(winter, town)).toEqual([])
    expect(greenhousesOn(autumn, home)).toEqual([])
  })
})
