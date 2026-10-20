import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { acceptErrand, bakeBread, completeErrand, giveGift, harvestPlant, plantSeed, weedBed } from '../../api/game'
import type { Catalog, Dialogue, Door, Errand, GameState, GardenMap, Npc, Puzzle } from '../../api/types'
import { frameImage, loadAtlas, type Atlas } from '../../game/atlas'
import { composeCharacter, composeCharacterFrames } from '../../game/character'
import { WEED_MS, type WeedEffect } from '../../game/effects'
import { fogBand, fogDensity, fogTalk, notchesLine } from '../../game/fog'
import { beaconBand, beaconEnough, beaconTalk, beaconWindows } from '../../game/beacon'
import { person, thanksDialogue } from '../../game/gifts'
import { glowBand, glowTalk, withGlow } from '../../game/glow'
import { GardenCanvas } from '../../game/GardenCanvas'
import { doorOpen, doorReachable, errandReady, isClickable, isNear, markerPoint, npcAt, plantsOn, promptCell, promptPoint, sameThing, WEEDING_TOOLS, type Objective } from '../../game/guidance'
import type { Facing } from '../../game/movement'
import { CREATURE_GLOW, standingAt, type Scene } from '../../game/renderer'
import {
  describeCell,
  HOME,
  MENTOR_SPOT,
  minutesUntilNextStage,
  nextGrowthRefresh,
  objectAt,
  PLAYER_SPOT,
  propAt,
  withRevived,
  withWeeded,
  type Cell,
} from '../../game/layout'
import { describeReward } from '../../lib/rewards'
import { Button } from '../../ui/Button'
import { ProduceIcon } from '../../ui/icons/ProduceIcon'
import { SeedPacketIcon } from '../../ui/icons/SeedPacketIcon'
import { Window } from '../../ui/Window'
import { DialogueBox, MentorDialogue } from '../mentor/DialogueBox'
import { useToast } from '../notifications/Toasts'
import styles from './GardenView.module.css'
import { LockOverlay } from './LockOverlay'
import { RecipeBlock } from './RecipeBlock'
import { HeroPortrait, Said } from './Said'
import { Voyage, VOYAGE_MS } from './Voyage'
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
  /** Интерфейс поверх поля: задание (сверху слева), счётчик (сверху справа), кнопки панели (снизу) */
  hud: { top: ReactNode; corner: ReactNode; toolbar: ReactNode }
}

/**
 * Пасхалка: если облик игрока совпал с «слот:вариант» из секретов персонажа — особый разговор.
 * Показывается один раз (помнит браузер): секрет, который повторяется, перестаёт быть секретом.
 */
function secretTalk(secrets: Record<string, string> | null | undefined, appearance: Record<string, string>, who: string): string | null {
  for (const [match, dialogue] of Object.entries(secrets ?? {})) {
    const [slot, option] = match.split(':')
    if (appearance[slot] !== option) continue
    const key = `secret-${who}-${dialogue}`
    try {
      if (window.localStorage.getItem(key) === '1') continue
      window.localStorage.setItem(key, '1')
    } catch {
      // хранилище недоступно — пасхалка просто покажется ещё раз
    }
    return dialogue
  }
  return null
}

/** Портрет мыши: вся мышь целиком — она маленькая и сидит внизу кадра 32×48. */
const MOUSE_CROP: [number, number] = [0, 16]
/** Портрет жителя-человека: голова и плечи из спрайта 32×48, как у героя */
const PERSON_CROP: [number, number] = [0, 4]

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

/** Случайное число для выбора реплики (вне компонента: в разговорах случайность — это нормально). */
const roll = () => Math.random()

/** Какую новость о тумане Тишь уже рассказала (густой → редеет → рассеялся) — чтобы новую сказать сразу. */
const FOG_HEARD = 'where-grows-fog-heard'

function heardFogBand(): number | null {
  try {
    const value = window.localStorage.getItem(FOG_HEARD)
    return value === null ? null : Number(value)
  } catch {
    return null
  }
}

function rememberFogBand(band: number) {
  try {
    if ((heardFogBand() ?? -1) < band) window.localStorage.setItem(FOG_HEARD, String(band))
  } catch {
    // не запомнилось — Тишь просто повторит новость
  }
}

/** Какую новость о грибнице Мох уже рассказал (тёмная → разгорается → горит вся). */
const GLOW_HEARD = 'where-grows-glow-heard'

function heardGlowBand(): number | null {
  try {
    const value = window.localStorage.getItem(GLOW_HEARD)
    return value === null ? null : Number(value)
  } catch {
    return null
  }
}

function rememberGlowBand(band: number) {
  try {
    if ((heardGlowBand() ?? -1) < band) window.localStorage.setItem(GLOW_HEARD, String(band))
  } catch {
    // не запомнилось — Мох просто повторит новость
  }
}

/** Какую новость о маяке Кора уже рассказала (тёмный → загораются → хватает). */
const BEACON_HEARD = 'where-grows-beacon-heard'

function heardBand(key: string): number | null {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? null : Number(value)
  } catch {
    return null
  }
}

function rememberBand(key: string, band: number) {
  try {
    if ((heardBand(key) ?? -1) < band) window.localStorage.setItem(key, String(band))
  } catch {
    // не запомнилось — новость просто повторится
  }
}

/** Текст постройки + строчка про зарубки, если это причал у тумана. */
function withNotches(read: string, propKey: string, map: GardenMap, fog: GameState['fog']): string {
  const line = notchesLine(propKey, map, fog)
  return line ? `${read}\n\n${line}` : read
}

/** Где игрок сейчас: какая локация, где появиться и куда смотреть. */
type Location = { key: string; start: Cell; facing: Facing }
const START: Location = { key: HOME, start: PLAYER_SPOT, facing: 'down' }

/**
 * Только для разработки: `?at=<ключ локации>` ставит героя у входа в неё — чтобы посмотреть графику
 * и свет, не проходя весь путь. На прогресс не влияет: где стоит герой, сервер не знает.
 * В собранной игре параметр игнорируется.
 */
function devStart(catalog: Catalog): Location {
  if (!import.meta.env.DEV) return START
  const key = new URLSearchParams(window.location.search).get('at')
  const entry = key && catalog.locations.flatMap((l) => l.props).find((p) => p.door?.map === key)?.door
  return entry ? { key: entry.map, start: { x: entry.x, y: entry.y }, facing: entry.facing } : START
}

/** Сколько длится затемнение и проявление при переходе в другую локацию. */
const FADE_MS = 350
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Фонарь на посохе Вереска — смещение от его ступней; в сумерках он светит тёплым пятном. */
const MENTOR_LANTERN = { x: 13, y: -35, radius: 46, strength: 0.85 }

/** Сенсорный экран: подсказка про управление — пальцем, а не клавишами. */
const touchScreen = window.matchMedia?.('(pointer: coarse)').matches ?? false

const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y

/** Сад и другие локации (сарай изнутри), табличка о выбранном объекте, посадка, прополка, двери. */
export function GardenView({ state, catalog, onChanged, onEditCharacter, inputEnabled, objective, hud }: Props) {
  const [location, setLocation] = useState<Location>(() => devStart(catalog))
  const home = location.key === HOME
  // разговор с жителем локации; accept — в конце разговора житель даёт поручение
  const [chat, setChat] = useState<{ npc: Npc; dialogue: string; accept?: Errand; custom?: Dialogue } | null>(null)
  // житель, которому выбираем подарок из сумки
  const [giftFor, setGiftFor] = useState<Npc | null>(null)
  // карта текущей локации; в саду — с учётом прополотых грядок. Сторож, чьё поручение выполнено,
  // уходит с дороги (но договаривает благодарность до конца)
  const map = useMemo((): GardenMap => {
    const base = catalog.locations.find((l) => l.key === location.key) ?? catalog.garden
    const awake = new Set(state.worldObjects.map((w) => w.objectKey))
    const map = withGlow(withRevived(base.key === HOME ? withWeeded(base, state.garden.weeded) : base, awake), state.glow)
    const done = (key: string | null | undefined) => !!key && !!state.errands.find((e) => e.key === key)?.done
    // сторож уходит с дороги, семья Агаты уплывает из городка и появляется в поместье;
    // пока с жителем идёт разговор, он не исчезает посреди фразы
    const gone = (n: Npc) =>
      chat?.npc.key !== n.key &&
      ((!!n.errand?.leaves && done(n.errand.key)) || done(n.leavesAfter) || (!!n.appearsAfter && !done(n.appearsAfter)))
    return map.npcs?.some(gone) ? { ...map, npcs: map.npcs.filter((n) => !gone(n)) } : map
  }, [catalog, location.key, state.garden.weeded, state.worldObjects, state.errands, state.glow, chat])
  // читаем письмо — текст в окне поверх сада
  const [reading, setReading] = useState<{ title: string; text: string } | null>(null)
  // замок крупным планом поверх сада
  const [lock, setLock] = useState<Puzzle | null>(null)
  // идёт прополка: анимация мотыги, персонаж стоит
  const [weeding, setWeeding] = useState<WeedEffect | null>(null)
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
    // маяк: фонарь наверху горит, когда окон хватает
    if (state.beacon && beaconEnough(state.beacon)) variants.set(state.beacon.prop, 'awakened')
    return {
      objects: plantsOn(state, map),
      effects: weeding ? [weeding] : [],
      fog: fogDensity(state.fog, map.key),
      windows: beaconWindows(map, state.beacon, catalog),
      awakened,
      variants,
      // секретки не мерцают: догадаться надо самому
      sparkles: new Set(catalog.spots.filter((spot) => !spot.hidden && !searched.has(spot.key)).map((spot) => spot.propKey)),
      characters: [
        ...(home && mentorImage ? [standingAt(MENTOR_SPOT, mentorImage, MENTOR_LANTERN)] : []),
        ...(map.npcs ?? []).flatMap((npc) => {
          // житель-человек — собран из тех же слоёв, что и герой; зверь — свой спрайт npc_<kind>_0/1
          if (npc.appearance) {
            const person = composeCharacter(atlas.atlas, npc.appearance, catalog.appearance)
            return [standingAt(npc, person)]
          }
          const idle = [0, 1].map((f) => frameImage(atlas.atlas, `npc_${npc.kind}_${f}`))
          if (!idle[0] || !idle[1]) return []
          // существа Светлолесья светятся сами
          return [{ ...standingAt(npc, idle[0], CREATURE_GLOW[npc.kind]), idle: [idle[0], idle[1]] }]
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
  // подсказка про управление — пока игрок ни разу не прошёлся (первый вызов — при появлении на карте)
  const [showHint, setShowHint] = useState(true)
  const moves = useRef(0)
  const onPlayerMove = useCallback((at: Cell, facing: Cell) => {
    if (++moves.current > 2) setShowHint(false)
    setPlayerCell(at)
    facingRef.current = facing
    setFacing(facing)
    setSelected(null)
    setTooFar(false)
    // в двери не затягивает: войти — клавишей действия (E/пробел) или кнопкой в описании
  }, [])

  const [dialogue, setDialogue] = useState<string | null>(null)
  const talk = () => {
    // пасхалка от облика — когда у Вереска нет новостей (поручения и благодарности важнее)
    const secret = !state.mentor.hasNews && secretTalk(catalog.mentor.secrets, state.player.appearance, 'vereshk')
    if (secret) return setDialogue(secret)
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
  // плавание через озеро: дверь на причале — между затемнением и новой локацией плывёт лодка
  const [voyage, setVoyage] = useState<1 | -1 | null>(null)
  const travel = (door: Door) => {
    if (fade !== 'none' || !doorOpen(door, state)) return
    if (reducedMotion()) return enter(door)
    setFade('out')
    const from = map.props.find((p) => p.door === door)
    if (from?.kind === 'dock' || from?.kind === 'pier') {
      // в городок — направо (он на том берегу), обратно — налево; к острову — налево, с острова — направо
      const direction = from.kind === 'pier' ? (door.map === 'island' ? -1 : 1) : door.requiresFog ? 1 : -1
      fadeTimers.current = [
        window.setTimeout(() => setVoyage(direction), FADE_MS),
        window.setTimeout(() => {
          setVoyage(null)
          enter(door)
          setFade('in')
        }, FADE_MS + VOYAGE_MS),
        window.setTimeout(() => setFade('none'), FADE_MS * 2 + VOYAGE_MS),
      ]
      return
    }
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

  /**
   * Заговорить с жителем: если у него поручение и он ещё не просил — просьба (в конце поручение берётся);
   * взято, но не сделано — напоминание; иначе — обычная болтовня.
   */
  const talkTo = (npc: Npc) => {
    const errand = npc.errand
    const status = errand && state.errands.find((e) => e.key === errand.key)
    if (errand && !status?.offered) return setChat({ npc, dialogue: errand.offer, accept: errand })
    if (errand && !status?.done) return setChat({ npc, dialogue: errand.waiting })
    // субботний хлеб: у пекаря (Агаты дома) разговор о каравае
    if (map.bread?.npc === npc.key && state.bread?.home) {
      if (state.bread.today && !state.bread.baked) return void bake(npc)
      if (state.bread.baked || roll() < 0.4) {
        return setChat({ npc, dialogue: state.bread.baked ? map.bread.talks.baked : map.bread.talks.waiting })
      }
    }
    const secret = secretTalk(npc.secrets, state.player.appearance, npc.key)
    const fog = fogTalk(npc.key, map, state.fog, heardFogBand(), roll())
    if (fog && state.fog) rememberFogBand(fogBand(state.fog))
    const glow = fog ? null : glowTalk(npc.key, map, state.glow, heardGlowBand(), roll())
    if (glow && state.glow) rememberGlowBand(glowBand(state.glow))
    const beacon = fog || glow ? null : beaconTalk(npc.key, map, state.beacon, heardBand(BEACON_HEARD), roll())
    if (beacon && state.beacon) rememberBand(BEACON_HEARD, beaconBand(state.beacon))
    setChat({ npc, dialogue: secret ?? fog ?? glow ?? beacon ?? nextTalk(npc) })
  }

  const isMentor = (cell: Cell) => home && sameCell(cell, MENTOR_SPOT)

  /**
   * Житель: сразу — без табличек и кнопок. Поручение готово — отдаём (сервер списывает вещи
   * вместе с наградой), и житель благодарит; иначе просто разговор.
   */
  const [handing, setHanding] = useState(false)
  /** Суббота: Агата отдаёт каравай — Семена жизни по числу хороших дней недели. */
  const bake = async (npc: Npc) => {
    if (handing || !map.bread) return
    setHanding(true)
    try {
      const result = await bakeBread()
      toast({
        message: `Субботний каравай: хороших дней на этой неделе — ${result.days}.`,
        reward: describeReward(result.reward, catalog),
      })
      setChat({ npc, dialogue: map.bread.talks.ready })
      await onChanged()
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось. Попробуйте ещё раз.' })
    } finally {
      setHanding(false)
    }
  }

  const meet = async (npc: Npc) => {
    if (!errandReady(npc, state) || handing) return talkTo(npc)
    setHanding(true)
    try {
      const result = await completeErrand(npc.errand!.key)
      if (result.reward.length) toast({ message: `${npc.name} благодарит.`, reward: describeReward(result.reward, catalog) })
      setChat({ npc, dialogue: npc.errand!.thanks })
      await onChanged()
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось. Попробуйте ещё раз.' })
    } finally {
      setHanding(false)
    }
  }

  /** Нажали на что-то рядом: с персонажем — сразу действие, у предмета — описание. */
  const open = (cell: Cell) => {
    setTooFar(false)
    if (isMentor(cell)) {
      setSelected(null)
      return talk()
    }
    const npc = npcAt(map, cell)
    if (npc) {
      setSelected(null)
      return void meet(npc)
    }
    setSelected(cell)
    setNow(Date.now())
  }

  /**
   * Действие (E / пробел / ✋): с наставником — заговорить; у объекта с «!» первое нажатие
   * открывает описание, следующее — нажимает его главную кнопку (обыскать, пробудить, посадить).
   */
  const act = () => {
    const facing = facingRef.current
    if (!facing) return
    if (isMentor(facing) || npcAt(map, facing)) return open(facing)
    // дверь перед собой — сразу внутрь (если она открыта и подошли с правильной стороны)
    const doorProp = propAt(map, facing.x, facing.y)
    if (doorProp?.door && doorOpen(doorProp.door, state) && doorReachable(doorProp, playerCell, facing)) return travel(doorProp.door)
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

  const harvest = async (cell: Cell) => {
    setPlanting(true)
    try {
      const got = await harvestPlant(map.key, cell.x, cell.y)
      const name = catalog.items.find((i) => i.key === got.itemKey)?.name ?? got.itemKey
      toast({ message: `Собрано: ${name}${got.quantity > 1 ? ` ×${got.quantity}` : ''}. Можно подарить кому-нибудь из жителей.` })
      setSelected(null)
      await onChanged()
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось собрать. Попробуйте ещё раз.' })
    } finally {
      setPlanting(false)
    }
  }

  // урожай в сумке — что можно подарить
  const produce = catalog.items
    .filter((item) => item.kind === 'PRODUCE')
    .map((item) => ({ item, quantity: state.inventory.find((e) => e.itemKey === item.key)?.quantity ?? 0 }))
    .filter(({ quantity }) => quantity > 0)
  const canGift = (npc: Npc) => produce.length > 0 && !(state.giftedToday ?? []).includes(person(npc.key))

  const gift = async (npc: Npc, itemKey: string) => {
    setGiftFor(null)
    try {
      const result = await giveGift(npc.key, itemKey)
      const seeds = result.reward.reduce((sum, r) => sum + r.quantity, 0)
      if (result.loved && result.talk) setChat({ npc, dialogue: result.talk })
      else setChat({ npc, dialogue: 'gift-thanks', custom: thanksDialogue(catalog.items.find((i) => i.key === itemKey)?.name) })
      toast({ message: `${npc.name} благодарит: +${seeds} ${seeds === 1 ? 'Семя' : 'Семени'} жизни.${result.loved ? ' Любимый подарок!' : ''}` })
      await onChanged()
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось подарить. Попробуйте ещё раз.' })
    }
  }

  const plant = async (cell: Cell, seedKey: string) => {
    setPlanting(true)
    try {
      const planted = await plantSeed(map.key, cell.x, cell.y, seedKey)
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

  // о выбранном говорит сам герой — окно в стиле разговора (а подсказки управления — обычной табличкой)
  const talking =
    !!selected && (sameCell(selected, playerCell) || (isClickable(selected, state, catalog, map) && atlas.status === 'ready'))

  return (
    <section className={styles.screen} aria-label={map.name}>
      <div className={styles.field}>
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
          {voyage && atlas.status === 'ready' && <Voyage atlas={atlas.atlas} hero={playerFrames?.side[0] ?? null} direction={voyage} />}
          {lock && atlas.status === 'ready' && (
            <LockOverlay puzzle={lock} catalog={catalog} atlas={atlas.atlas} onClose={() => setLock(null)} onChanged={onChanged} />
          )}
        </div>
      </div>

      <div className={styles.top}>
        <div className={styles.topLeft}>{hud.top}</div>
        <div className={styles.topRight}>{hud.corner}</div>
      </div>

      <div className={styles.bottom}>
        <div
          className={talking ? styles.talk : selected || tooFar || showHint ? styles.info : styles.infoHidden}
          aria-live="polite"
          ref={infoRef}
        >
          {/* описания — как разговоры жителей: портрет героя, имя предмета табличкой, текст по буквам */}
          {talking && <HeroPortrait image={playerFrames?.down[0] ?? null} />}
          <div className={talking ? styles.talkBody : undefined}>
          {selected && sameCell(selected, playerCell) ? (
            <div className={styles.cell}>
              <Said name={state.player.displayName} text="Это я. Сад, кажется, уже привык к моим шагам." />
              <div>
                <Button onClick={onEditCharacter}>Изменить облик</Button>
              </div>
            </div>
          ) : selected && isClickable(selected, state, catalog, map) && atlas.status === 'ready' ? (
            <CellInfo
              cell={selected}
              player={playerCell}
              map={map}
              state={state}
              catalog={catalog}
              now={now}
              planting={planting}
              onPlant={plant}
              onHarvest={(cell) => void harvest(cell)}
              onEnter={travel}
              onRead={setReading}
              onLock={setLock}
              onWeeding={setWeeding}
              onChanged={onChanged}
            />
          ) : tooFar ? (
            <span className={styles.hint}>Подойдите поближе: когда над ним загорится «!», нажмите на него.</span>
          ) : showHint ? (
            <span className={styles.hint}>
              {touchScreen
                ? 'Ведите пальцем по саду — идти. Нажмите на «!» над предметом или на жителя.'
                : 'Стрелки или WASD — идти. Подойдите к предмету — загорится «!»: нажмите на него или E.'}
            </span>
          ) : null}
          </div>
        </div>
        {hud.toolbar}
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
          speaker={
            chat.npc.appearance && atlas.status === 'ready'
              ? { name: chat.npc.name, frame: '', crop: PERSON_CROP, image: composeCharacter(atlas.atlas, chat.npc.appearance, catalog.appearance) }
              : { name: chat.npc.name, frame: `npc_${chat.npc.kind}_0`, crop: MOUSE_CROP }
          }
          dialogue={chat.custom ?? chat.npc.dialogues[chat.dialogue]}
          atlas={atlas.atlas}
          extra={
            !chat.accept && !chat.custom && chat.dialogue !== chat.npc.gifts?.talk && canGift(chat.npc)
              ? { label: 'Подарить…', onClick: () => setGiftFor(chat.npc) }
              : undefined
          }
          onEnd={async () => {
            if (!chat.accept) return
            try {
              await acceptErrand(chat.accept.key)
              toast({ message: `Новое поручение: ${chat.accept.goal}.` })
              await onChanged()
            } catch {
              toast({ message: 'Не получилось взять поручение. Поговорите ещё раз.' })
            }
          }}
          onClose={() => setChat(null)}
        />
      )}

      {giftFor && (
        <Window title={`Подарок: ${giftFor.name}`} onClose={() => setGiftFor(null)}>
          <div className={styles.seeds}>
            <span className={styles.label}>Что подарить? Каждому жителю — один подарок в день.</span>
            {produce.map(({ item, quantity }) => (
              <Button key={item.key} onClick={() => void gift(giftFor, item.key)} className={styles.seed}>
                <ProduceIcon />
                {item.name}
                <span className={styles.count}>×{quantity}</span>
              </Button>
            ))}
          </div>
        </Window>
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
  /** Где стоит герой: в постройку входят только спереди */
  player: Cell
  map: GardenMap
  state: GameState
  catalog: Catalog
  now: number
  planting: boolean
  onPlant: (cell: Cell, seedKey: string) => void
  onHarvest: (cell: Cell) => void
  onEnter: (door: Door) => void
  onRead: (letter: { title: string; text: string }) => void
  onLock: (puzzle: Puzzle) => void
  onWeeding: (effect: WeedEffect | null) => void
  onChanged: () => Promise<void>
}

function CellInfo({ cell, player, map, state, catalog, now, planting, onPlant, onHarvest, onEnter, onRead, onLock, onWeeding, onChanged }: CellInfoProps) {
  const object = objectAt(plantsOn(state, map), cell)
  if (object) {
    const species = catalog.species.find((s) => s.key === object.speciesKey)
    const name = species?.name ?? object.speciesKey
    const minutes = minutesUntilNextStage(object, now)
    const produce = species?.produceKey ? catalog.items.find((i) => i.key === species.produceKey) : undefined
    return (
      <div className={styles.cell}>
        <Said
          name={name}
          text={
            object.mature
              ? produce
                ? `Выросло! Можно собрать: ${produce.name}${species!.produceQuantity > 1 ? ` ×${species!.produceQuantity}` : ''}. А можно оставить — никуда не денется.`
                : 'Выросло и никуда не денется. Сад стал чуточку живее.'
              : `Растёт: стадия ${object.stage + 1} из ${object.stageCount}. Следующая — примерно через ${minutes} мин.`
          }
        />
        {object.mature && produce && (
          <div>
            <Button disabled={planting} onClick={() => onHarvest(cell)}>Собрать</Button>
          </div>
        )}
      </div>
    )
  }

  const info = describeCell(map, cell)
  if (!info) return null

  const prop = propAt(map, cell.x, cell.y)
  // ночная тропка днём закрыта, но описание с подсказкой «приходите вечером» всё равно нужно
  if ((prop?.door && (doorOpen(prop.door, state) || prop.door.requiresNight)) || prop?.read) {
    const { door, read } = prop
    return (
      <div className={styles.cell}>
        <Said name={info.name} text={info.description} />
        <div>
          {door && doorOpen(door, state) && doorReachable(prop, player, cell) && <Button onClick={() => onEnter(door)}>{door.label}</Button>}
          {door && doorOpen(door, state) && !doorReachable(prop, player, cell) && (
            <p className={styles.hint}>Вход — с другой стороны: подойдите к двери.</p>
          )}
          {door?.requiresNight && !state.night && (
            <p className={styles.hint}>Днём тропка теряется через три шага. Приходите вечером — с 20:00 до 6:00 её освещают цветы.</p>
          )}
          {door?.requiresFog && !doorOpen(door, state) && (
            <p className={styles.hint}>
              В таком тумане плыть рано. Он редеет с каждым днём, когда вы возвращаетесь к привычкам
              {state.fog?.started ? ` (${state.fog.days} из ${state.fog.needed})` : ''}.
            </p>
          )}
          {read && (
            <Button onClick={() => onRead({ title: info.name, text: withNotches(read, prop.key, map, state.fog) })}>Прочитать</Button>
          )}
        </div>
      </div>
    )
  }

  const puzzle = prop && catalog.puzzles.find((p) => p.propKey === prop.key)
  if (puzzle) {
    return (
      <div className={styles.cell}>
        <Said name={info.name} text={info.description} />
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
  // У постройки бывает и находка, и рецепт (в печи лежал фонарь очага, а потом её разжигают):
  // пока находка не забрана — она; забрана — рецепт, чтобы «вы уже всё нашли» не прятало «Разжечь»
  const spot = prop && catalog.spots.find((s) => s.propKey === prop.key)
  const recipeHere = prop && catalog.recipes.some((r) => r.targetObjectKey === prop.key)
  if (spot && !(recipeHere && state.searchedSpots.includes(spot.key))) {
    return (
      <div className={styles.cell}>
        <Said name={info.name} text={info.description} />
        <SpotBlock key={spot.key} spotKey={spot.key} state={state} catalog={catalog} onChanged={onChanged} />
      </div>
    )
  }

  const recipe = prop && catalog.recipes.find((r) => r.targetObjectKey === prop.key)
  if (recipe) {
    const awakened = state.worldObjects.some((w) => w.objectKey === recipe.targetObjectKey)
    return (
      <div className={styles.cell}>
        <Said name={info.name} text={awakened ? '' : info.description} />
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
      <Said name={info.name} text={info.description} />
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
    const request = weedBed(cell.x, cell.y)
    // Управление выключено только на время анимации: ответ сервера может идти долго
    // (бесплатный сервер просыпается около минуты), а стоять столбом всё это время нельзя.
    void sleep(WEED_MS).then(() => onWeeding(null))
    try {
      const result = await request
      await onChanged()
      toast({
        message: result.remaining > 0
          ? `Грядка прополота. Заросших клеток осталось: ${result.remaining}.`
          : 'Последний сорняк сдался! Расскажите Вереску.',
      })
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось прополоть. Попробуйте ещё раз.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.cell}>
      <Said name={name} text={description} />
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
