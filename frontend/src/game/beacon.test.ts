import { describe, expect, it } from 'vitest'
import type { Catalog, GardenMap } from '../api/types'
import { beaconBand, beaconTalk, beaconWindows } from './beacon'

const map = {
  key: 'island',
  props: [{ key: 'lighthouse', x: 9, y: 1 }],
  beacon: { after: 'x', prop: 'lighthouse', needed: 3, speaker: 'kora', talks: ['dark', 'some', 'enough'] },
} as unknown as GardenMap
const catalog = { crystals: [{ key: 'emerald', color: '#0f0' }, { key: 'amethyst', color: '#f0f' }, { key: 'sapphire', color: '#00f' }] } as unknown as Catalog

describe('маяк', () => {
  it('окно горит цветом своего кристалла', () => {
    const windows = beaconWindows(map, { map: 'island', prop: 'lighthouse', started: true, lit: ['amethyst'], needed: 3 }, catalog)
    expect(windows).toEqual([{ x: 9 * 32 + 40, y: 32 + 92, color: '#f0f' }])
  })

  it('Кора рассказывает новость сразу; трёх разных окон хватает', () => {
    const some = { map: 'island', prop: 'lighthouse', started: true, lit: ['emerald'], needed: 3 }
    expect(beaconBand(some)).toBe(1)
    expect(beaconTalk('kora', map, some, 0, 0.9)).toBe('some')
    expect(beaconTalk('kora', map, { ...some, lit: ['emerald', 'amethyst', 'ruby'] }, 1, 0.9)).toBe('enough')
  })
})
