import type { Catalog, ItemGrant } from '../api/types'

export type RewardLine = { itemKey: string; label: string; quantity: number; color: string | null }

/** Превращает награду с сервера в строки для уведомления: название из каталога и цвет кристалла. */
export function describeReward(reward: ItemGrant[], catalog: Catalog): RewardLine[] {
  const items = new Map(catalog.items.map((item) => [item.key, item]))
  const colors = new Map(catalog.crystals.map((crystal) => [crystal.key, crystal.color]))

  return reward.map((grant) => {
    const item = items.get(grant.itemKey)
    return {
      itemKey: grant.itemKey,
      label: item?.name ?? grant.itemKey,
      quantity: grant.quantity,
      color: item?.crystalCategory ? (colors.get(item.crystalCategory) ?? null) : null,
    }
  })
}
