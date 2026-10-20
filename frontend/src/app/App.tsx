import { useCallback, useState } from 'react'
import type { ApiError } from '../api/client'
import { LIFE_SEED, SUN_SPARK, type GameState } from '../api/types'
import { CharacterEditor } from '../features/character/CharacterEditor'
import { CollectionPanel } from '../features/collection/CollectionPanel'
import { GardenView } from '../features/garden/GardenView'
import { HabitTracker } from '../features/habits/HabitTracker'
import { InventoryPanel } from '../features/inventory/InventoryPanel'
import { ToastProvider } from '../features/notifications/Toasts'
import { QuestMenu } from '../features/mentor/QuestMenu'
import { SettingsPanel } from '../features/settings/SettingsPanel'
import { ShopPanel } from '../features/shop/ShopPanel'
import { currentObjective } from '../game/guidance'
import { Button } from '../ui/Button'
import { HudButton } from '../ui/HudButton'
import { BagIcon, CollectionIcon, SettingsIcon, ShopIcon, TrackerIcon } from '../ui/icons/HudIcons'
import { LifeSeedIcon } from '../ui/icons/LifeSeedIcon'
import { SunSparkIcon } from '../ui/icons/SunSparkIcon'
import { Panel } from '../ui/Panel'
import { Window } from '../ui/Window'
import styles from './App.module.css'
import { RotateHint } from './RotateHint'
import { enterFullscreen } from './settings'
import { SettingsProvider } from './SettingsProvider'
import { Splash } from './Splash'
import { useGame } from './useGame'

type OpenWindow = 'habits' | 'shop' | 'bag' | 'collection' | 'character' | 'settings' | null

/**
 * Главный экран — игровое поле во весь экран: сад в центре, всё остальное лежит поверх него, как в игре.
 * Сверху — задание от Вереска и счётчик семян, снизу — кнопки панели; описания, разговоры и замок —
 * тоже в поле. Привычки, лавка и сумка открываются окнами поверх сада.
 */
export function App() {
  return (
    <SettingsProvider>
      <Game />
    </SettingsProvider>
  )
}

const coarsePointer = () => window.matchMedia?.('(pointer: coarse)').matches ?? false

function Game() {
  const { game, reload, refresh } = useGame()
  // заставка при запуске; на телефоне «начать» заодно включает полный экран и горизонталь
  const [started, setStarted] = useState(false)
  const start = useCallback(() => {
    setStarted(true)
    if (coarsePointer()) void enterFullscreen()
  }, [])
  const [open, setOpen] = useState<OpenWindow>(null)
  const close = useCallback(() => setOpen(null), [])
  const objective = game.status === 'ready' ? currentObjective(game.state, game.catalog) : null
  const isTarget = (key: string) => objective?.target.kind === 'hud' && objective.target.key === key
  const openHud = (key: string) => {
    if (key === 'habits' || key === 'shop' || key === 'bag' || key === 'collection') setOpen(key)
  }

  return (
    <ToastProvider>
      <div className={styles.screen}>
        {game.status === 'error' ? (
          <LoadError error={game.error} onRetry={reload} />
        ) : game.status === 'ready' ? (
          <GardenView
            state={game.state}
            catalog={game.catalog}
            onChanged={refresh}
            onEditCharacter={() => setOpen('character')}
            inputEnabled={started && open === null && game.state.player.onboarded}
            objective={objective}
            hud={{
              top: game.state.player.onboarded ? (
                <QuestMenu objective={objective} state={game.state} catalog={game.catalog} onOpenHud={openHud} />
              ) : null,
              corner: <PlayerBadge state={game.state} />,
              toolbar: (
                <nav className={styles.toolbar} aria-label="Действия">
                  <HudButton
                    compact
                    icon={<TrackerIcon />}
                    label="Привычки"
                    onClick={() => setOpen('habits')}
                    badge={habitsBadge(game.state)}
                    highlight={isTarget('habits')}
                  />
                  <HudButton compact icon={<ShopIcon />} label="Лавка" onClick={() => setOpen('shop')} highlight={isTarget('shop')} />
                  <HudButton compact icon={<BagIcon />} label="Сумка" onClick={() => setOpen('bag')} highlight={isTarget('bag')} />
                  <HudButton
                    compact
                    icon={<CollectionIcon />}
                    label="Коллекция"
                    onClick={() => setOpen('collection')}
                    highlight={isTarget('collection')}
                    badge={game.state.artifacts.length > 0 ? String(game.state.artifacts.length) : undefined}
                  />
                  <HudButton compact icon={<SettingsIcon />} label="Настройки" onClick={() => setOpen('settings')} />
                </nav>
              ),
            }}
          />
        ) : (
          <div className={styles.loading} aria-busy="true">
            <p className={styles.gardenNote}>Отворяем калитку…</p>
          </div>
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

        {open === 'settings' && (
          <Window title="Настройки" onClose={close}>
            <SettingsPanel game={game.status === 'ready' ? { state: game.state, onChanged: refresh } : undefined} />
          </Window>
        )}

        {game.status === 'ready' && open === 'collection' && (
          <Window title="Коллекция находок" onClose={close}>
            <CollectionPanel state={game.state} catalog={game.catalog} />
          </Window>
        )}

        {!started && game.status !== 'error' && <Splash ready={game.status === 'ready'} onStart={start} />}
        <RotateHint />

        {game.status === 'ready' && started && !game.state.player.onboarded && (
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
    <div className={styles.badge} title="Локальный режим: без входа, данные хранятся на этом компьютере">
      <span className={styles.name}>{state.player.displayName}</span>
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
            ? 'Сервер сада не отвечает. Если игра давно не открывалась, он просыпается около минуты — попробуйте ещё раз.'
            : `Сервер ответил: «${error.detail ?? error.title}».`}
        </p>
        <Button onClick={onRetry}>Попробовать ещё раз</Button>
      </Panel>
    </main>
  )
}
