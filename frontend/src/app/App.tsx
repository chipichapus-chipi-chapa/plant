import { useCallback, useState } from 'react'
import type { ApiError } from '../api/client'
import { LIFE_SEED, SUN_SPARK, type GameState } from '../api/types'
import { CharacterEditor } from '../features/character/CharacterEditor'
import { CollectionPanel } from '../features/collection/CollectionPanel'
import { GardenView } from '../features/garden/GardenView'
import { HabitTracker } from '../features/habits/HabitTracker'
import { InventoryPanel } from '../features/inventory/InventoryPanel'
import { ToastProvider } from '../features/notifications/Toasts'
import { QuestTracker } from '../features/mentor/QuestTracker'
import { ShopPanel } from '../features/shop/ShopPanel'
import { currentObjective } from '../game/guidance'
import { Button } from '../ui/Button'
import { HudButton } from '../ui/HudButton'
import { BagIcon, CollectionIcon, ShopIcon, TrackerIcon } from '../ui/icons/HudIcons'
import { LifeSeedIcon } from '../ui/icons/LifeSeedIcon'
import { SunSparkIcon } from '../ui/icons/SunSparkIcon'
import { Panel } from '../ui/Panel'
import { Window } from '../ui/Window'
import styles from './App.module.css'
import { useGame } from './useGame'

type OpenWindow = 'habits' | 'shop' | 'bag' | 'collection' | 'character' | null

/**
 * Главный экран: сад в центре, под ним панель действий. Привычки, лавка и сумка
 * открываются окнами поверх сада — сад всегда остаётся главным.
 */
export function App() {
  const { game, reload, refresh } = useGame()
  const [open, setOpen] = useState<OpenWindow>(null)
  const close = useCallback(() => setOpen(null), [])
  const objective = game.status === 'ready' ? currentObjective(game.state, game.catalog) : null
  const isTarget = (key: string) => objective?.target.kind === 'hud' && objective.target.key === key
  const openHud = (key: string) => {
    if (key === 'habits' || key === 'shop' || key === 'bag' || key === 'collection') setOpen(key)
  }

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
          <main className={styles.stage}>
            {game.status === 'ready' && objective && game.state.player.onboarded && (
              <QuestTracker objective={objective} speaker={game.catalog.mentor.speaker.name} onOpenHud={openHud} />
            )}
            {game.status === 'ready' ? (
              <GardenView
                state={game.state}
                catalog={game.catalog}
                onChanged={refresh}
                onEditCharacter={() => setOpen('character')}
                inputEnabled={open === null && game.state.player.onboarded}
                objective={objective}
              />
            ) : (
              <div className={styles.garden} aria-busy="true">
                <p className={styles.gardenNote}>Отворяем калитку…</p>
              </div>
            )}

            {game.status === 'ready' && (
              <nav className={styles.toolbar} aria-label="Действия">
                <HudButton
                  icon={<TrackerIcon />}
                  label="Привычки"
                  onClick={() => setOpen('habits')}
                  badge={habitsBadge(game.state)}
                  highlight={isTarget('habits')}
                />
                <HudButton icon={<ShopIcon />} label="Лавка" onClick={() => setOpen('shop')} highlight={isTarget('shop')} />
                <HudButton icon={<BagIcon />} label="Сумка" onClick={() => setOpen('bag')} highlight={isTarget('bag')} />
                <HudButton
                  icon={<CollectionIcon />}
                  label="Коллекция"
                  onClick={() => setOpen('collection')}
                  highlight={isTarget('collection')}
                  badge={game.state.artifacts.length > 0 ? String(game.state.artifacts.length) : undefined}
                />
              </nav>
            )}
          </main>
        )}

        {game.status === 'ready' && open === 'habits' && (
          <Window title="Трекер привычек" size="wide" onClose={close}>
            <HabitTracker state={game.state} catalog={game.catalog} onChanged={refresh} />
          </Window>
        )}
        {game.status === 'ready' && open === 'shop' && (
          <Window title="Лавка семян" onClose={close}>
            <ShopPanel state={game.state} catalog={game.catalog} onChanged={refresh} />
          </Window>
        )}
        {game.status === 'ready' && open === 'bag' && (
          <Window title="Сумка" onClose={close}>
            <InventoryPanel inventory={game.state.inventory} catalog={game.catalog} />
          </Window>
        )}

        {game.status === 'ready' && open === 'collection' && (
          <Window title="Коллекция находок" onClose={close}>
            <CollectionPanel state={game.state} catalog={game.catalog} />
          </Window>
        )}

        {game.status === 'ready' && !game.state.player.onboarded && (
          <Window title="Новый садовник" onClose={close} dismissible={false}>
            <CharacterEditor state={game.state} catalog={game.catalog} firstTime onDone={refresh} onCancel={close} />
          </Window>
        )}
        {game.status === 'ready' && game.state.player.onboarded && open === 'character' && (
          <Window title="Облик" onClose={close}>
            <CharacterEditor
              state={game.state}
              catalog={game.catalog}
              firstTime={false}
              onDone={async () => {
                await refresh()
                close()
              }}
              onCancel={close}
            />
          </Window>
        )}

        <footer className={styles.footer}>Локальный режим разработки: без входа, данные хранятся на этом компьютере.</footer>
      </div>
    </ToastProvider>
  )
}

/** Сколько привычек отмечено сегодня — нейтрально, без «осталось» и процентов. */
function habitsBadge(state: GameState): string | undefined {
  const done = state.habits.filter((h) => h.doneToday).length
  return done > 0 ? `✓${done}` : undefined
}

function PlayerBadge({ state }: { state: GameState }) {
  const quantity = (key: string) => state.inventory.find((entry) => entry.itemKey === key)?.quantity ?? 0
  const sparks = quantity(SUN_SPARK)
  return (
    <div className={styles.badge}>
      <span>{state.player.displayName}</span>
      <span className={styles.coins} title="Семена жизни">
        <LifeSeedIcon />
        {quantity(LIFE_SEED)}
        <span className={styles.visuallyHidden}> — Семена жизни</span>
      </span>
      {/* Искры редки: показываем, только когда они есть — не перегружаем шапку */}
      {sparks > 0 && (
        <span className={styles.coins} title="Солнечные искры">
          <SunSparkIcon />
          {sparks}
          <span className={styles.visuallyHidden}> — Солнечные искры</span>
        </span>
      )}
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
