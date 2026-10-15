import type { Catalog, GameState } from '../../api/types'
import { Panel } from '../../ui/Panel'
import styles from './InventoryPanel.module.css'

type Props = {
  inventory: GameState['inventory']
  catalog: Catalog
}

export function InventoryPanel({ inventory, catalog }: Props) {
  const names = new Map(catalog.items.map((item) => [item.key, item.name]))

  return (
    <Panel title="Сумка">
      {inventory.length === 0 ? (
        <p className={styles.empty}>Пока пусто. Даже крошек нет.</p>
      ) : (
        <ul className={styles.list}>
          {inventory.map((entry) => (
            <li key={entry.itemKey} className={styles.row}>
              <span>{names.get(entry.itemKey) ?? entry.itemKey}</span>
              <span className={styles.qty}>×{entry.quantity}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
