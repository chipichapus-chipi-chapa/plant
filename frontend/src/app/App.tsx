import type { ApiError } from '../api/client'
import type { GameState } from '../api/types'
import { InventoryPanel } from '../features/inventory/InventoryPanel'
import { Button } from '../ui/Button'
import { DewIcon } from '../ui/icons/DewIcon'
import { Panel } from '../ui/Panel'
import styles from './App.module.css'
import { useGame } from './useGame'

export function App() {
  const { game, reload } = useGame()

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Там, где растёт</h1>
        {game.status === 'ready' && <PlayerBadge player={game.state.player} />}
      </header>

      {game.status === 'error' ? (
        <LoadError error={game.error} onRetry={reload} />
      ) : (
        <main className={styles.main}>
          {/* Сюда встанет canvas-сад (задача 7). Пока — пустая земля в масштабе будущей сетки. */}
          <div className={styles.garden} aria-label="Сад" aria-busy={game.status === 'loading'}>
            <p className={styles.gardenNote}>
              {game.status === 'loading' ? 'Отворяем калитку…' : 'Сад ещё зарос. Скоро здесь появятся грядки.'}
            </p>
          </div>

          {game.status === 'ready' && (
            <aside className={styles.sidebar}>
              <Panel title="Привычки">
                <p className={styles.empty}>Здесь будут дела, за которые сад скажет спасибо.</p>
              </Panel>
              <InventoryPanel inventory={game.state.inventory} catalog={game.catalog} />
            </aside>
          )}
        </main>
      )}

      <footer className={styles.footer}>Локальный режим разработки: без входа, данные хранятся на этом компьютере.</footer>
    </div>
  )
}

function PlayerBadge({ player }: { player: GameState['player'] }) {
  return (
    <div className={styles.badge}>
      <span>{player.displayName}</span>
      <span className={styles.coins} title="Росинки">
        <DewIcon />
        {player.coins}
        <span className={styles.visuallyHidden}> росинок</span>
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
