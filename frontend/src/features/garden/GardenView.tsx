import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { plantSeed, weedBed } from '../../api/game'
import type { Catalog, Door, GameState, GardenMap, Npc, Puzzle } from '../../api/types'
import { frameImage, loadAtlas, type Atlas } from '../../game/atlas'
import { composeCharacterFrames } from '../../game/character'
import { WEED_MS, type WeedEffect } from '../../game/effects'
import { GardenCanvas } from '../../game/GardenCanvas'
import { doorOpen, isClickable, isNear, markerPoint, npcAt, promptCell, promptPoint, sameThing, WEEDING_TOOLS, type Objective } from '../../game/guidance'
import type { Facing } from '../../game/movement'
import { standingAt, type Scene } from '../../game/renderer'
import {
  describeCell,
  HOME,
  MENTOR_SPOT,
  minutesUntilNextStage,
  nextGrowthRefresh,
  objectAt,
  PLAYER_SPOT,
  propAt,
  withWeeded,
  type Cell,
} from '../../game/layout'
import { Button } from '../../ui/Button'
import { SeedPacketIcon } from '../../ui/icons/SeedPacketIcon'
import { Window } from '../../ui/Window'
import { DialogueBox, MentorDialogue } from '../mentor/DialogueBox'
import { useToast } from '../notifications/Toasts'
import styles from './GardenView.module.css'
import { LockOverlay } from './LockOverlay'
import { RecipeBlock } from './RecipeBlock'
import { SpotBlock } from './SpotBlock'

type AtlasLoad = { status: 'loading' } | { status: 'ready'; atlas: Atlas } | { status: 'error' }

type Props = {
  state: GameState
  catalog: Catalog
  onChanged: () => Promise<void>
  /** Открыть окно изменения облика (клик по своему персонажу) */
  onEditCharacter: () => void
  /** Можно ходить: не открыто ни одно окно */
  inputEnabled: boolean
  /** Текущее задание от Вереска — над его целью в саду покачивается «!» */
  objective: Objective | null
}

/** Портрет мыши: вся мышь целиком — она маленькая и сидит внизу кадра 32×48. */
const MOUSE_CROP: [number, number] = [0, 16]

/**
 * С какой реплики начать разговор с жителем: при первой встрече — знакомство (talks[0]),
 * потом — случайный из остальных. Кого уже встречали, помнит браузер: наград за мышей нет,
 * поэтому серверу это хранить незачем.
 */
function nextTalk(npc: Npc): string {
  const key = `met-npc-${npc.key}`
  let met = false
  try {
    met = window.localStorage.getItem(key) === '1'
    window.localStorage.setItem(key, '1')
  } catch {
    // хранилище недоступно (приватное окно) — просто каждый раз знакомимся заново
  }
  const rest = npc.talks.slice(1)
  return !met || rest.length === 0 ? npc.talks[0] : rest[Math.floor(Math.random() * rest.length)]
}

/** Где игрок сейчас: какая локация, где появиться и куда смотреть. */
type Location = { key: string; start: Cell; facing: Facing }
const START: Location = { key: HOME, start: PLAYER_SPOT, facing: 'down' }

/** Сколько длится затемнение и проявление при переходе в другую локацию. */
const FADE_MS = 350
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Фонарь на посохе Вереска — смещение от его ступней; в сумерках он светит тёплым пятном. */
const MENTOR_LANTERN = { x: 13, y: -35, radius: 46, strength: 0.85 }

const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y

/** Сад и другие локации (сарай изнутри), табличка о выбранном объекте, посадка, прополка, двери. */
export function GardenView({ state, catalog, onChanged, onEditCharacter, inputEnabled, objective }: Props) {
  const [location, setLocation] = useState<Location>(START)
  const home = location.key === HOME
  // карта текущей локации; в саду — с учётом прополотых грядок
  const map = useMemo((): GardenMap => {
    const base = catalog.locations.find((l) => l.key === location.key) ?? catalog.garden
    return base.key === HOME ? withWeeded(base, state.garden.weeded) : base
  }, [catalog, location.key, state.garden.weeded])
  // читаем письмо — текст в окне поверх сада
  const [reading, setReading] = useState<{ title: string; text: string } | null>(null)
  // замок крупным планом поверх сада
  const [lock, setLock] = useState<Puzzle | null>(null)
  // идёт прополка: анимация мотыги, персонаж стоит
  const [weeding, setWeeding] = useState<WeedEffect | null>(null)
  // разговор с жителем локации (мышью)
  const [chat, setChat] = useState<{ npc: Npc; dialogue: string } | null>(null)
  // помещение (есть стены): при входе сначала темно, потом зажигается лампа
  const indoor = Object.values(map.tiles).some((t) => t.type === 'wall')
  // кто стоит в клетках и не пускает пройти: Вереск в саду, жители в своих локациях
  const standing = useMemo(
    () => [...(home ? [MENTOR_SPOT] : []), ...(map.npcs ?? []).map((n) => ({ x: n.x, y: n.y }))],
    [home, map],
  )
  const [atlas, setAtlas] = useState<AtlasLoad>({ status: 'loading' })
  // клетка перед персонажем: если с ней можно что-то сделать, над ней загорается «!»
  const [facing, setFacing] = useState<Cell | null>(null)
  // открытое описание: только после нажатия на объект с «!» (или клавиши действия)
  const [selected, setSelected] = useState<Cell | null>(null)
  // нажали на объект издалека — подсказываем подойти
  const [tooFar, setTooFar] = useState(false)
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
    const mentorImage = frameImage(atlas.atlas, 'npc_vereshk')
    const searched = new Set(state.searchedSpots)
    const awakened = new Set(state.worldObjects.map((w) => w.objectKey))
    // особый кадр постройки: починена/пробуждена, обыскана (инструменты сняты), замок открыт
    const variants = new Map<string, string>()
    for (const spot of catalog.spots) if (searched.has(spot.key)) variants.set(spot.propKey, 'searched')
    for (const puzzle of catalog.puzzles) if (state.solvedPuzzles.includes(puzzle.key)) variants.set(puzzle.propKey, 'open')
    for (const key of awakened) variants.set(key, 'awakened')
    return {
      objects: home ? state.garden.objects : [],
      effects: weeding ? [weeding] : [],
      awakened,
      variants,
      sparkles: new Set(catalog.spots.filter((spot) => !searched.has(spot.key)).map((spot) => spot.propKey)),
      characters: [
        ...(home && mentorImage ? [standingAt(MENTOR_SPOT, mentorImage, MENTOR_LANTERN)] : []),
        ...(map.npcs ?? []).flatMap((npc) => {
          const idle = [0, 1].map((f) => frameImage(atlas.atlas, `npc_${npc.kind}_${f}`))
          if (!idle[0] || !idle[1]) return []
          return [{ ...standingAt(npc, idle[0]), idle: [idle[0], idle[1]] }]
        }),
      ],
      bubbles: home && state.mentor.hasNews ? [MENTOR_SPOT] : [],
      prompt: facing && isClickable(facing, state, catalog, map) ? promptPoint(facing, map) : null,
      marker: objective ? markerPoint(objective.target, map, state) : null,
    }
  }, [atlas, state, catalog, facing, objective, map, home, weeding])

  const playerFrames = useMemo(
    () => (atlas.status === 'ready' ? composeCharacterFrames(atlas.atlas, state.player.appearance, catalog.appearance) : null),
    [atlas, state.player.appearance, catalog.appearance],
  )

  // Где стоит персонаж и куда смотрит: клетка перед ним становится выбранной
  const [playerCell, setPlayerCell] = useState<Cell>(location.start)
  const facingRef = useRef<Cell | null>(null)
  const infoRef = useRef<HTMLDivElement>(null)
  // Отошёл или отвернулся — описание закрывается; новое откроется, когда нажмёшь на «!»
  // Подошёл к двери и упёрся в неё — экран гаснет, и персонаж оказывается по ту сторону.
  // Обработчик хода стабилен (useCallback без зависимостей), поэтому свежую карту и переход читает из ref.
  const mapRef = useRef(map)
  const travelRef = useRef<(door: Door) => void>(() => {})
  const onPlayerMove = useCallback((at: Cell, facing: Cell) => {
    setPlayerCell(at)
    facingRef.current = facing
    setFacing(facing)
    setSelected(null)
    setTooFar(false)
    const door = propAt(mapRef.current, facing.x, facing.y)?.door
    if (door) travelRef.current(door)
  }, [])

  const [dialogue, setDialogue] = useState<string | null>(null)
  const talk = () => {
    const idle = catalog.mentor.idle
    setDialogue(state.mentor.nextDialogue ?? idle[Math.floor(Math.random() * idle.length)])
  }

  /** Пройти в дверь: другая локация, персонаж появляется в клетке за дверью. */
  const enter = (door: Door) => {
    setLocation({ key: door.map, start: { x: door.x, y: door.y }, facing: door.facing })
    setPlayerCell({ x: door.x, y: door.y })
    setFacing(null)
    facingRef.current = null
    setSelected(null)
    setTooFar(false)
  }

  // Переход: затемнение → смена локации → проявление. Пока идёт — персонаж стоит.
  const [fade, setFade] = useState<'none' | 'out' | 'in'>('none')
  const fadeTimers = useRef<number[]>([])
  useEffect(() => () => fadeTimers.current.forEach((t) => window.clearTimeout(t)), [])
  const travel = (door: Door) => {
    if (fade !== 'none' || !doorOpen(door, state)) return
    if (reducedMotion()) return enter(door)
    setFade('out')
    fadeTimers.current = [
      window.setTimeout(() => {
        enter(door)
        setFade('in')
      }, FADE_MS),
      window.setTimeout(() => setFade('none'), FADE_MS * 2),
    ]
  }
  useLayoutEffect(() => {
    mapRef.current = map
    travelRef.current = travel
  })

  const isMentor = (cell: Cell) => home && sameCell(cell, MENTOR_SPOT)

  /** Описание объекта перед персонажем: открыть (если над ним горит «!»). */
  const open = (cell: Cell) => {
    setSelected(cell)
    setTooFar(false)
    setNow(Date.now())
  }

  /**
   * Действие (E / пробел / ✋): с наставником — заговорить; у объекта с «!» первое нажатие
   * открывает описание, следующее — нажимает его главную кнопку (обыскать, пробудить, посадить).
   */
  const act = () => {
    const facing = facingRef.current
    if (!facing) return
    if (isMentor(facing)) {
      talk()
      return
    }
    const npc = npcAt(map, facing)
    if (npc) {
      setChat({ npc, dialogue: nextTalk(npc) })
      return
    }
    if (!isClickable(facing, state, catalog, map)) return
    if (!selected || !sameThing(selected, facing, map)) {
      open(facing)
      return
    }
    infoRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.click()
  }

  // Знакомство начинается само — один раз, сразу после создания персонажа
  const introOpened = useRef(false)
  useEffect(() => {
    if (atlas.status === 'ready' && state.player.onboarded && state.mentor.nextDialogue === catalog.mentor.intro && !introOpened.current) {
      introOpened.current = true
      setDialogue(catalog.mentor.intro)
    }
  }, [atlas.status, state.player.onboarded, state.mentor.nextDialogue, catalog.mentor.intro])

  /**
   * Нажатие на клетку. Описание открывается у объекта рядом с персонажем — по нему самому
   * или по «!» над ним; до далёкого объекта сначала надо дойти. Свой персонаж открывает «Изменить облик».
   */
  const select = (cell: Cell | null) => {
    if (cell && sameCell(cell, playerCell)) return open(cell)
    const target = facing && isClickable(facing, state, catalog, map) ? facing : null
    if (cell && target && (sameThing(cell, target, map) || sameCell(cell, promptCell(target, map)))) return open(target)
    if (cell && isClickable(cell, state, catalog, map) && isNear(cell, playerCell, map)) return open(cell)
    setSelected(null)
    setTooFar(!!cell && isClickable(cell, state, catalog, map))
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
      <div className={styles.stage}>
        {atlas.status === 'ready' && scene && playerFrames ? (
          <GardenCanvas
            // новая локация — новый холст: персонаж появляется у двери
            key={map.key}
            map={map}
            scene={scene}
            standing={standing}
            atlas={atlas.atlas}
            player={{ frames: playerFrames, start: location.start, facing: location.facing }}
            onSelect={select}
            onPlayerMove={onPlayerMove}
            onAction={act}
            inputEnabled={inputEnabled && dialogue === null && reading === null && lock === null && fade === 'none' && weeding === null && chat === null}
            lightUp={indoor}
          />
        ) : (
          <div className={styles.placeholder} style={{ aspectRatio: `${map.width} / ${map.height}` }}>
            <p className={styles.note}>
              {atlas.status === 'loading' ? 'Раздвигаем ветки…' : 'Картинки сада не загрузились. Обновите страницу.'}
            </p>
          </div>
        )}
        {fade !== 'none' && <div className={`${styles.fade} ${fade === 'out' ? styles.fadeOut : styles.fadeIn}`} aria-hidden="true" />}
        {lock && atlas.status === 'ready' && (
          <LockOverlay puzzle={lock} catalog={catalog} atlas={atlas.atlas} onClose={() => setLock(null)} onChanged={onChanged} />
        )}
      </div>

      <div className={styles.info} aria-live="polite" ref={infoRef}>
        {selected && isMentor(selected) ? (
          <div className={styles.cell}>
            <p className={styles.text}>
              <strong>{catalog.mentor.speaker.name}.</strong> Опирается на посох и делает вид, что не ждёт, когда с ним заговорят.
            </p>
            <div>
              <Button onClick={talk}>Поговорить</Button>
            </div>
          </div>
        ) : selected && npcAt(map, selected) ? (
          <div className={styles.cell}>
            <p className={styles.text}>
              <strong>{npcAt(map, selected)!.name}.</strong> {npcAt(map, selected)!.description}
            </p>
            <div>
              <Button onClick={() => setChat({ npc: npcAt(map, selected)!, dialogue: nextTalk(npcAt(map, selected)!) })}>
                Поговорить
              </Button>
            </div>
          </div>
        ) : selected && sameCell(selected, playerCell) ? (
          <div className={styles.cell}>
            <p className={styles.text}>
              <strong>{state.player.displayName}.</strong> Это вы. Сад, кажется, уже привык к вашим шагам.
            </p>
            <div>
              <Button onClick={onEditCharacter}>Изменить облик</Button>
            </div>
          </div>
        ) : selected && isClickable(selected, state, catalog, map) && atlas.status === 'ready' ? (
          <CellInfo
            cell={selected}
            map={map}
            state={state}
            catalog={catalog}
            now={now}
            planting={planting}
            onPlant={plant}
            onEnter={travel}
            onRead={setReading}
            onLock={setLock}
            onWeeding={setWeeding}
            onChanged={onChanged}
          />
        ) : tooFar ? (
          <span className={styles.hint}>Подойдите поближе: когда над ним загорится «!», нажмите на него.</span>
        ) : (
          <span className={styles.hint}>
            Стрелки или WASD — идти. Подойдите к предмету — загорится «!»: нажмите на него или E, чтобы рассмотреть.
          </span>
        )}
      </div>

      {reading && (
        <Window title={reading.title} onClose={() => setReading(null)}>
          <div className={styles.letter}>
            {reading.text.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </Window>
      )}

      {chat && atlas.status === 'ready' && (
        <DialogueBox
          key={chat.npc.key + chat.dialogue}
          speaker={{ name: chat.npc.name, frame: `npc_${chat.npc.kind}_0`, crop: MOUSE_CROP }}
          dialogue={chat.npc.dialogues[chat.dialogue]}
          atlas={atlas.atlas}
          onEnd={() => undefined}
          onClose={() => setChat(null)}
        />
      )}

      {dialogue && atlas.status === 'ready' && (
        <MentorDialogue
          key={dialogue}
          dialogueKey={dialogue}
          catalog={catalog}
          atlas={atlas.atlas}
          onClose={() => setDialogue(null)}
          onChanged={onChanged}
        />
      )}
    </section>
  )
}

type CellInfoProps = {
  cell: Cell
  map: GardenMap
  state: GameState
  catalog: Catalog
  now: number
  planting: boolean
  onPlant: (cell: Cell, seedKey: string) => void
  onEnter: (door: Door) => void
  onRead: (letter: { title: string; text: string }) => void
  onLock: (puzzle: Puzzle) => void
  onWeeding: (effect: WeedEffect | null) => void
  onChanged: () => Promise<void>
}

function CellInfo({ cell, map, state, catalog, now, planting, onPlant, onEnter, onRead, onLock, onWeeding, onChanged }: CellInfoProps) {
  const object = map.key === HOME ? objectAt(state.garden.objects, cell) : undefined
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

  const info = describeCell(map, cell)
  if (!info) return null

  const prop = propAt(map, cell.x, cell.y)
  if ((prop?.door && doorOpen(prop.door, state)) || prop?.read) {
    const { door, read } = prop
    return (
      <div className={styles.cell}>
        <p className={styles.text}>
          <strong>{info.name}.</strong> {info.description}
        </p>
        <div>
          {door && doorOpen(door, state) && <Button onClick={() => onEnter(door)}>{door.label}</Button>}
          {read && <Button onClick={() => onRead({ title: info.name, text: read })}>Прочитать</Button>}
        </div>
      </div>
    )
  }

  const puzzle = prop && catalog.puzzles.find((p) => p.propKey === prop.key)
  if (puzzle) {
    return (
      <div className={styles.cell}>
        <p className={styles.text}>
          <strong>{info.name}.</strong> {info.description}
        </p>
        {state.solvedPuzzles.includes(puzzle.key) ? (
          <p className={styles.hint}>Замок открыт, ящик пуст — всё нужное уже у вас.</p>
        ) : (
          <div>
            <Button onClick={() => onLock(puzzle)}>Осмотреть замок</Button>
          </div>
        )}
      </div>
    )
  }

  if (!prop && map.key === HOME && map.tiles[map.rows[cell.y]?.[cell.x] ?? '']?.type === 'overgrown') {
    return (
      <WeedInfo cell={cell} name={info.name} description={info.description} state={state} onWeeding={onWeeding} onChanged={onChanged} />
    )
  }
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

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/**
 * Заросшая грядка: прополоть, если есть лопата и грабли. Прополотая клетка станет обычной грядкой.
 * Анимация (мотыга, вылетающие сорняки) начинается сразу, запрос к серверу идёт параллельно;
 * грядка меняется ближе к концу анимации, когда клочки уже падают.
 */
function WeedInfo({ cell, name, description, state, onWeeding, onChanged }: {
  cell: Cell
  name: string
  description: string
  state: GameState
  onWeeding: (effect: WeedEffect | null) => void
  onChanged: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const hasTools = (state.inventory.find((e) => e.itemKey === WEEDING_TOOLS)?.quantity ?? 0) > 0

  const weed = async () => {
    setBusy(true)
    onWeeding({ kind: 'weed', cell, at: performance.now() })
    try {
      const [result] = await Promise.all([weedBed(cell.x, cell.y), sleep(WEED_MS - 250)])
      await onChanged()
      toast({
        message: result.remaining > 0
          ? `Грядка прополота. Заросших клеток осталось: ${result.remaining}.`
          : 'Последний сорняк сдался! Расскажите Вереску.',
      })
      await sleep(250)
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось прополоть. Попробуйте ещё раз.' })
    } finally {
      onWeeding(null)
      setBusy(false)
    }
  }

  return (
    <div className={styles.cell}>
      <p className={styles.text}>
        <strong>{name}.</strong> {description}
      </p>
      {hasTools ? (
        <div>
          <Button onClick={() => void weed()} disabled={busy}>
            Прополоть
          </Button>
        </div>
      ) : (
        <p className={styles.hint}>Лопата и грабли висят на северном заборе.</p>
      )}
    </div>
  )
}
