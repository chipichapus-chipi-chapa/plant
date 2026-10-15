import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../api/client'
import { plantSeed } from '../../api/game'
import type { Catalog, GameState } from '../../api/types'
import { loadAtlas, type Atlas } from '../../game/atlas'
import { composeCharacter } from '../../game/character'
import { GardenCanvas } from '../../game/GardenCanvas'
import type { Scene } from '../../game/renderer'
import {
  describeCell,
  minutesUntilNextStage,
  nextGrowthRefresh,
  objectAt,
  PLAYER_SPOT,
  propAt,
  type Cell,
} from '../../game/layout'
import { Button } from '../../ui/Button'
import { SeedPacketIcon } from '../../ui/icons/SeedPacketIcon'
import { useToast } from '../notifications/Toasts'
import styles from './GardenView.module.css'
import { RecipeBlock } from './RecipeBlock'
import { SpotBlock } from './SpotBlock'

type AtlasLoad = { status: 'loading' } | { status: 'ready'; atlas: Atlas } | { status: 'error' }

type Props = {
  state: GameState
  catalog: Catalog
  onChanged: () => Promise<void>
  /** Открыть окно изменения облика (клик по своему персонажу) */
  onEditCharacter: () => void
}

const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y

/** Сад, табличка о выбранной клетке и посадка из сумки. */
export function GardenView({ state, catalog, onChanged, onEditCharacter }: Props) {
  const map = catalog.garden
  const [atlas, setAtlas] = useState<AtlasLoad>({ status: 'loading' })
  const [selected, setSelected] = useState<Cell | null>(null)
  const [planting, setPlanting] = useState(false)
  // «Сейчас» для подписей вроде «через 5 мин»: обновляется раз в 30 секунд
  const [now, setNow] = useState(() => Date.now())
  const toast = useToast()

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    loadAtlas()
      .then((loaded) => active && setAtlas({ status: 'ready', atlas: loaded }))
      .catch(() => active && setAtlas({ status: 'error' }))
    return () => {
      active = false
    }
  }, [])

  // Стадию считает сервер; когда наступит ближайшая смена стадии — тихо перечитываем состояние
  useEffect(() => {
    const delay = nextGrowthRefresh(state.garden.objects, Date.now())
    if (delay === null) return
    const timer = window.setTimeout(() => void onChanged(), delay)
    return () => window.clearTimeout(timer)
  }, [state.garden.objects, onChanged])

  // Всё, что меняется у игрока, собирается в «сцену» для рендера
  const scene = useMemo((): Scene | null => {
    if (atlas.status !== 'ready') return null
    const searched = new Set(state.searchedSpots)
    return {
      objects: state.garden.objects,
      awakened: new Set(state.worldObjects.map((w) => w.objectKey)),
      sparkles: new Set(catalog.spots.filter((spot) => !searched.has(spot.key)).map((spot) => spot.propKey)),
      characters: [
        { ...PLAYER_SPOT, image: composeCharacter(atlas.atlas, state.player.appearance, catalog.appearance) },
      ],
    }
  }, [atlas, state.garden.objects, state.worldObjects, state.searchedSpots, state.player.appearance, catalog])

  const select = (cell: Cell | null) => {
    setSelected(cell)
    setNow(Date.now())
  }

  const plant = async (cell: Cell, seedKey: string) => {
    setPlanting(true)
    try {
      const planted = await plantSeed(cell.x, cell.y, seedKey)
      setNow(Date.now())
      const name = catalog.species.find((s) => s.key === planted.speciesKey)?.name ?? planted.speciesKey
      const minutes = minutesUntilNextStage(planted, Date.now())
      toast({ message: `Посажено: ${name}.${minutes ? ` Первые листья — примерно через ${minutes} мин.` : ''}` })
      await onChanged()
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось посадить. Попробуйте ещё раз.' })
    } finally {
      setPlanting(false)
    }
  }

  return (
    <section className={styles.garden} aria-label={map.name}>
      {atlas.status === 'ready' && scene ? (
        <GardenCanvas map={map} scene={scene} atlas={atlas.atlas} selected={selected} onSelect={select} />
      ) : (
        <div className={styles.placeholder} style={{ aspectRatio: `${map.width} / ${map.height}` }}>
          <p className={styles.note}>
            {atlas.status === 'loading' ? 'Раздвигаем ветки…' : 'Картинки сада не загрузились. Обновите страницу.'}
          </p>
        </div>
      )}

      <div className={styles.info} aria-live="polite">
        {selected && sameCell(selected, PLAYER_SPOT) ? (
          <div className={styles.cell}>
            <p className={styles.text}>
              <strong>{state.player.displayName}.</strong> Это вы. Сад, кажется, уже привык к вашим шагам.
            </p>
            <div>
              <Button onClick={onEditCharacter}>Изменить облик</Button>
            </div>
          </div>
        ) : selected ? (
          <CellInfo
            cell={selected}
            state={state}
            catalog={catalog}
            now={now}
            planting={planting}
            onPlant={plant}
            onChanged={onChanged}
          />
        ) : (
          <span className={styles.hint}>Нажмите на клетку сада, чтобы рассмотреть её поближе.</span>
        )}
      </div>
    </section>
  )
}

type CellInfoProps = {
  cell: Cell
  state: GameState
  catalog: Catalog
  now: number
  planting: boolean
  onPlant: (cell: Cell, seedKey: string) => void
  onChanged: () => Promise<void>
}

function CellInfo({ cell, state, catalog, now, planting, onPlant, onChanged }: CellInfoProps) {
  const object = objectAt(state.garden.objects, cell)
  if (object) {
    const name = catalog.species.find((s) => s.key === object.speciesKey)?.name ?? object.speciesKey
    const minutes = minutesUntilNextStage(object, now)
    return (
      <p className={styles.text}>
        <strong>{name}.</strong>{' '}
        {object.mature
          ? 'Выросло и никуда не денется. Сад стал чуточку живее.'
          : `Растёт: стадия ${object.stage + 1} из ${object.stageCount}. Следующая — примерно через ${minutes} мин.`}
      </p>
    )
  }

  const info = describeCell(catalog.garden, cell)
  if (!info) return null

  const prop = propAt(catalog.garden, cell.x, cell.y)
  const spot = prop && catalog.spots.find((s) => s.propKey === prop.key)
  if (spot) {
    return (
      <div className={styles.cell}>
        <p className={styles.text}>
          <strong>{info.name}.</strong> {info.description}
        </p>
        <SpotBlock key={spot.key} spotKey={spot.key} state={state} catalog={catalog} onChanged={onChanged} />
      </div>
    )
  }

  const recipe = prop && catalog.recipes.find((r) => r.targetObjectKey === prop.key)
  if (recipe) {
    const awakened = state.worldObjects.some((w) => w.objectKey === recipe.targetObjectKey)
    return (
      <div className={styles.cell}>
        <p className={styles.text}>
          <strong>{info.name}.</strong> {awakened ? '' : info.description}
        </p>
        <RecipeBlock recipe={recipe} state={state} catalog={catalog} onChanged={onChanged} />
      </div>
    )
  }

  const seeds = catalog.items
    .filter((item) => item.kind === 'SEED')
    .map((item) => ({ item, quantity: state.inventory.find((e) => e.itemKey === item.key)?.quantity ?? 0 }))
    .filter(({ quantity }) => quantity > 0)

  return (
    <div className={styles.cell}>
      <p className={styles.text}>
        <strong>{info.name}.</strong> {info.description}
      </p>
      {info.plantable &&
        (seeds.length > 0 ? (
          <div className={styles.seeds}>
            <span className={styles.label}>Посадить:</span>
            {seeds.map(({ item, quantity }) => {
              const species = catalog.species.find((s) => s.key === item.speciesKey)
              return (
                <Button key={item.key} disabled={planting} onClick={() => onPlant(cell, item.key)} className={styles.seed}>
                  <SeedPacketIcon />
                  {species?.name ?? item.name}
                  <span className={styles.count}>×{quantity}</span>
                </Button>
              )
            })}
          </div>
        ) : (
          <p className={styles.hint}>В сумке нет семян. Пакетики продаются в лавке — за Семена жизни.</p>
        ))}
    </div>
  )
}
