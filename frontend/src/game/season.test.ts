import { describe, expect, it } from 'vitest'
import type { GameState, GardenMap } from '../api/types'
import { bedAround, canPlantNow, greenhousesOn } from './season'

const tiles = { '.': { type: 'grass', plantable: false }, s: { type: 'soil', plantable: true }, S: { type: 'overgrown', plantable: false } }
const home = { key: 'home', width: 6, height: 5, tiles, props: [], rows: ['......', '.SSS..', '......', '.sss..', '.sss..'] } as unknown as GardenMap
const town = { ...home, key: 'town' } as GardenMap
const winter = {
  season: { season: 'WINTER', cold: true, greenhouses: [{ gardenKey: 'home', x: 1, y: 3 }], endsAt: '', wound: false },
} as unknown as GameState
const autumn = { season: { season: 'AUTUMN', cold: false, greenhouses: [], endsAt: '', wound: false } } as unknown as GameState

describe('времена года', () => {
  it('грядка — связный участок, якорь — верхняя левая клетка', () => {
    expect(bedAround(home, { x: 3, y: 4 })[0]).toEqual({ x: 1, y: 3 })
    expect(bedAround(home, { x: 2, y: 1 })).toHaveLength(3)
    expect(bedAround(home, { x: 0, y: 0 })).toEqual([])
  })

  it('зимой сажают только под теплицей над участком', () => {
    expect(canPlantNow(autumn, town, { x: 1, y: 3 })).toBe(true)
    expect(canPlantNow(winter, home, { x: 3, y: 4 })).toBe(true)
    expect(canPlantNow(winter, home, { x: 2, y: 1 })).toBe(false) // другой участок
    expect(canPlantNow(winter, town, { x: 1, y: 3 })).toBe(false)
  })

  it('теплица накрывает весь участок, только зимой и на своей карте', () => {
    expect(greenhousesOn(winter, home)).toEqual([{ x: 1, y: 3, w: 3, h: 2 }])
    expect(greenhousesOn(winter, town)).toEqual([])
    expect(greenhousesOn(autumn, home)).toEqual([])
  })
})
