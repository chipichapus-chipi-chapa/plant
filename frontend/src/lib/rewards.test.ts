import { describe, expect, it } from 'vitest'
import type { Catalog } from '../api/types'
import { describeReward } from './rewards'

const catalog: Catalog = {
  crystals: [{ key: 'emerald', name: 'Изумруд роста', color: '#4fae6a', meaning: '' }],
  species: [],
  items: [
    { key: 'life_seed', kind: 'CURRENCY', name: 'Семена жизни', description: '', price: null, speciesKey: null, crystalCategory: null },
    { key: 'shard_emerald', kind: 'SHARD', name: 'Осколок изумруда', description: '', price: null, speciesKey: null, crystalCategory: 'emerald' },
  ],
}

describe('describeReward', () => {
  it('подписывает награду названиями из каталога и цветом кристалла', () => {
    expect(
      describeReward(
        [
          { itemKey: 'life_seed', quantity: 3 },
          { itemKey: 'shard_emerald', quantity: 1 },
        ],
        catalog,
      ),
    ).toEqual([
      { itemKey: 'life_seed', label: 'Семена жизни', quantity: 3, color: null },
      { itemKey: 'shard_emerald', label: 'Осколок изумруда', quantity: 1, color: '#4fae6a' },
    ])
  })

  it('не ломается на предмете, которого нет в каталоге', () => {
    expect(describeReward([{ itemKey: 'mystery', quantity: 2 }], catalog)[0]).toMatchObject({ label: 'mystery', quantity: 2 })
  })
})
