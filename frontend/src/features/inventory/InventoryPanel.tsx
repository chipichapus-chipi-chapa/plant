import type { Catalog, GameState } from '../../api/types'
import { CrystalIcon } from '../../ui/icons/CrystalIcon'
import { ItemIcon } from '../../ui/icons/ItemIcon'
import styles from './InventoryPanel.module.css'

type Props = {
  inventory: GameState['inventory']
  catalog: Catalog
}

/**
 * Сумка: осколки всех шести цветов (даже нулевые — так видно, какие бывают)
 * и предметы. Семена жизни показаны в шапке, здесь их нет.
 */
export function InventoryPanel({ inventory, catalog }: Props) {
  const quantities = new Map(inventory.map((entry) => [entry.itemKey, entry.quantity]))
  const shards = catalog.crystals.flatMap((crystal) => {
    const item = catalog.items.find((i) => i.kind === 'SHARD' && i.crystalCategory === crystal.key)
    return item ? [{ crystal, item, quantity: quantities.get(item.key) ?? 0 }] : []
  })
  const things = catalog.items
    .filter((item) => (item.kind === 'SEED' || item.kind === 'DECOR' || item.kind === 'TOOL' || item.kind === 'PRODUCE') && (quantities.get(item.key) ?? 0) > 0)
    .map((item) => ({ item, quantity: quantities.get(item.key)! }))

  return (
    <div className={styles.content}>
      <h3 className={styles.heading}>Осколки кристаллов</h3>
      <ul className={styles.shards}>
        {shards.map(({ crystal, item, quantity }) => (
          <li
            key={item.key}
            className={quantity > 0 ? styles.shard : styles.shardEmpty}
            title={`${item.name} (${crystal.name}). ${item.description}`}
          >
            <CrystalIcon color={crystal.color} size={24} muted={quantity === 0} />
            <span className={styles.shardQty}>{quantity}</span>
            <span className={styles.srOnly}>{item.name}</span>
          </li>
        ))}
      </ul>

      <h3 className={styles.heading}>Вещи</h3>
      {things.length === 0 ? (
        <p className={styles.empty}>Пока пусто. Даже крошек нет.</p>
      ) : (
        <ul className={styles.list}>
          {things.map(({ item, quantity }) => (
            <li key={item.key} className={styles.row} title={item.description}>
              <ItemIcon itemKey={item.key} kind={item.kind} />
              <span className={styles.name}>{item.name}</span>
              <span className={styles.qty}>×{quantity}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
