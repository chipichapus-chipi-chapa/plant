import type { Catalog, ItemGrant, ItemKind } from '../api/types'

export type RewardLine = { itemKey: string; kind: ItemKind | null; label: string; quantity: number; color: string | null }

/** Превращает награду с сервера в строки для уведомления: название из каталога и цвет кристалла. */
export function describeReward(reward: ItemGrant[], catalog: Pick<Catalog, 'items' | 'crystals'>): RewardLine[] {
  const items = new Map(catalog.items.map((item) => [item.key, item]))
  const colors = new Map(catalog.crystals.map((crystal) => [crystal.key, crystal.color]))

  return reward.map((grant) => {
    const item = items.get(grant.itemKey)
    return {
      itemKey: grant.itemKey,
      kind: item?.kind ?? null,
      label: item?.name ?? grant.itemKey,
      quantity: grant.quantity,
      color: item?.crystalCategory ? (colors.get(item.crystalCategory) ?? null) : null,
    }
  })
}
