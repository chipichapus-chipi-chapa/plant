import { useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { purchaseItem } from '../../api/game'
import { LIFE_SEED, type Catalog, type GameState } from '../../api/types'
import { newIdempotencyKey } from '../../lib/idempotency'
import { describeReward } from '../../lib/rewards'
import { Button } from '../../ui/Button'
import { LifeSeedIcon } from '../../ui/icons/LifeSeedIcon'
import { SeedPacketIcon } from '../../ui/icons/SeedPacketIcon'
import { useToast } from '../notifications/Toasts'
import styles from './ShopPanel.module.css'

type Props = {
  state: GameState
  catalog: Catalog
  onChanged: () => Promise<void>
}

/** Лавка семян: товары — предметы каталога с ценой. Цену и списание проверяет сервер. */
export function ShopPanel({ state, catalog, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  // Ключ покупки живёт, пока не пришёл однозначный ответ сервера.
  // Если ответ потерялся в сети, повторное нажатие отправит тот же ключ — и сервер не спишет дважды.
  const pendingKeys = useRef(new Map<string, string>())
  const toast = useToast()

  const balance = state.inventory.find((entry) => entry.itemKey === LIFE_SEED)?.quantity ?? 0
  // цветы из городка появляются в лавке, когда Лиза разбудила ирисы (её поручение выполнено)
  const unlocked = (item: (typeof catalog.items)[number]) =>
    !item.unlockErrand || state.errands.some((e) => e.key === item.unlockErrand && e.done)
  const goods = catalog.items.filter((item) => item.price !== null && unlocked(item)).sort((a, b) => a.price! - b.price!)

  const buy = async (itemKey: string) => {
    const key = pendingKeys.current.get(itemKey) ?? newIdempotencyKey()
    pendingKeys.current.set(itemKey, key)
    setBusy(itemKey)
    try {
      const result = await purchaseItem(itemKey, 1, key)
      pendingKeys.current.delete(itemKey)
      toast({ message: 'Куплено. Лавочник кивает.', reward: describeReward([result], catalog) })
      await onChanged()
    } catch (e) {
      if (e instanceof ApiError && e.kind === 'http') {
        pendingKeys.current.delete(itemKey)
        toast({ message: e.detail ?? e.title })
      } else {
        toast({ message: 'Связь оборвалась. Нажмите ещё раз — дважды не спишется.' })
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className={styles.content}>
      <ul className={styles.list}>
        {goods.map((item) => {
          const price = item.price!
          const missing = price - balance
          return (
            <li key={item.key} className={styles.row}>
              <SeedPacketIcon size={24} />
              <div className={styles.info}>
                <span className={styles.name}>{item.name}</span>
                <span className={styles.description}>{item.description}</span>
              </div>
              <div className={styles.buy}>
                <span className={styles.price}>
                  <LifeSeedIcon />
                  {price}
                </span>
                <Button
                  onClick={() => void buy(item.key)}
                  disabled={missing > 0 || busy !== null}
                  aria-label={`Купить: ${item.name} за ${price}`}
                >
                  Купить
                </Button>
                {missing > 0 && <span className={styles.missing}>ещё {missing}</span>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
