import type { ApiError } from '../api/client'
import { LIFE_SEED, type GameState } from '../api/types'
import { GardenView } from '../features/garden/GardenView'
import { HabitsPanel } from '../features/habits/HabitsPanel'
import { InventoryPanel } from '../features/inventory/InventoryPanel'
import { ToastProvider } from '../features/notifications/Toasts'
import { ShopPanel } from '../features/shop/ShopPanel'
import { Button } from '../ui/Button'
import { LifeSeedIcon } from '../ui/icons/LifeSeedIcon'
import { Panel } from '../ui/Panel'
import styles from './App.module.css'
import { useGame } from './useGame'

export function App() {
  const { game, reload, refresh } = useGame()

  return (
    <ToastProvider>
      <div className={styles.shell}>
        <header className={styles.header}>
          <h1 className={styles.logo}>Там, где растёт</h1>
          {game.status === 'ready' && <PlayerBadge state={game.state} />}
        </header>

        {game.status === 'error' ? (
          <LoadError error={game.error} onRetry={reload} />
        ) : (
          <main className={styles.main}>
            {game.status === 'ready' ? (
              <GardenView map={game.catalog.garden} />
            ) : (
              <div className={styles.garden} aria-busy="true">
                <p className={styles.gardenNote}>Отворяем калитку…</p>
              </div>
            )}

            {game.status === 'ready' && (
              <aside className={styles.sidebar}>
                <HabitsPanel state={game.state} catalog={game.catalog} onChanged={refresh} />
                <ShopPanel state={game.state} catalog={game.catalog} onChanged={refresh} />
                <InventoryPanel inventory={game.state.inventory} catalog={game.catalog} />
              </aside>
            )}
          </main>
        )}

        <footer className={styles.footer}>Локальный режим разработки: без входа, данные хранятся на этом компьютере.</footer>
      </div>
    </ToastProvider>
  )
}

function PlayerBadge({ state }: { state: GameState }) {
  const lifeSeeds = state.inventory.find((entry) => entry.itemKey === LIFE_SEED)?.quantity ?? 0
  return (
    <div className={styles.badge}>
      <span>{state.player.displayName}</span>
      <span className={styles.coins} title="Семена жизни">
        <LifeSeedIcon />
        {lifeSeeds}
        <span className={styles.visuallyHidden}> — Семена жизни</span>
      </span>
    </div>
  )
}

function LoadError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <main className={styles.errorWrap}>
      <Panel title="Калитка не открывается" className={styles.errorPanel}>
        <p className={styles.empty}>
          {error.kind === 'network'
            ? 'Сервер сада не отвечает. Если вы разрабатываете игру — проверьте, что backend запущен.'
            : `Сервер ответил: «${error.detail ?? error.title}».`}
        </p>
        <Button onClick={onRetry}>Попробовать ещё раз</Button>
      </Panel>
    </main>
  )
}
