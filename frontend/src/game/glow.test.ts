import { describe, expect, it } from 'vitest'
import type { GardenMap } from '../api/types'
import { glowBand, glowTalk, withGlow } from './glow'

const map = {
  key: 'hollow',
  tiles: { '.': { type: 'dreamgrass' }, m: { type: 'mycelium' }, M: { type: 'mycelium_lit' } },
  rows: ['m.m', '.m.'],
  glow: { after: 'x', days: 3, speaker: 'mokh', talks: ['dark', 'half', 'lit'] },
} as unknown as GardenMap

describe('грибница', () => {
  it('загорается по пятну за день, по порядку чтения', () => {
    expect(withGlow(map, { map: 'hollow', started: true, days: 2, needed: 3 }).rows).toEqual(['M.M', '.m.'])
    expect(withGlow(map, { map: 'hollow', started: true, days: 0, needed: 3 }).rows).toEqual(map.rows)
    expect(withGlow(map, { map: 'lake', started: true, days: 2, needed: 3 }).rows).toEqual(map.rows)
  })

  it('Мох рассказывает новость сразу, а потом через раз', () => {
    const half = { map: 'hollow', started: true, days: 1, needed: 3 }
    expect(glowBand(half)).toBe(1)
    expect(glowTalk('mokh', map, half, 0, 0.9)).toBe('half')
    expect(glowTalk('mokh', map, half, 1, 0.9)).toBeNull()
    expect(glowTalk('mokh', map, { ...half, days: 3 }, 1, 0.9)).toBe('lit')
    expect(glowTalk('tina', map, half, null, 0)).toBeNull()
  })
})
