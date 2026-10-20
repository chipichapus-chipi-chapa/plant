// Подсказки игроку: текущее задание от Вереска, над чьей целью покачивается «!»,
// и с чем рядом можно взаимодействовать (тогда над объектом загорается «!»).
// Всё считается для текущей локации (map): сад, сарай изнутри…

import type { Catalog, Door, GameState, GardenMap, GardenProp, Npc } from '../api/types'
import { fogCleared } from './fog'
import { beaconEnough } from './beacon'
import { glowLit } from './glow'

/** Существа крупнее героя: «!» над ними выше обычного. */
const BIG_CREATURES = new Set(['greatcat', 'nightcat', 'mosscat'])
import { HOME, MENTOR_SPOT, objectAt, propAt, TILE, tileAt, type Cell } from './layout'
import { CHARACTER_HEIGHT } from './renderer'

export type ObjectiveTarget =
  | { kind: 'mentor' }
  | { kind: 'hud'; key: string }
  | { kind: 'prop'; key: string }
  | { kind: 'tile'; type: string }

export type Objective = { text: string; target: ObjectiveTarget }

/** Лопата и грабли с забора: с ними можно полоть */
export const WEEDING_TOOLS = 'garden_tools'

const has = (state: GameState, itemKey: string) => (state.inventory.find((e) => e.itemKey === itemKey)?.quantity ?? 0) > 0

const hasSeeds = (state: GameState, catalog: Catalog) => catalog.items.some((i) => i.kind === 'SEED' && has(state, i.key))

const isMentor = (cell: Cell, map: GardenMap) => map.key === HOME && cell.x === MENTOR_SPOT.x && cell.y === MENTOR_SPOT.y

/** Житель локации в клетке (мышь), если есть. */
export function npcAt(map: GardenMap, cell: Cell): Npc | undefined {
  return map.npcs?.find((n) => n.x === cell.x && n.y === cell.y)
}

/** Открыта ли дверь: у калитки в ежевике — только после пробуждения, у тропы к озеру — после поручения Мяты. */
export function doorOpen(door: Door, state: GameState): boolean {
  const awake = !door.requires || state.worldObjects.some((w) => w.objectKey === door.requires)
  const errand = !door.requiresErrand || !!state.errands?.find((e) => e.key === door.requiresErrand)?.done
  const fog = !door.requiresFog || fogCleared(state.fog)
  const night = !door.requiresNight || state.night
  return awake && errand && fog && night
}

/**
 * Можно ли войти в дверь отсюда. В постройку выше одной клетки (сарай, дом) входят только спереди —
 * стоя под ней лицом вверх, а не со стены сбоку или сзади. Калитки, лодку и выход из комнаты (одна клетка)
 * можно открыть с любой стороны.
 */
export function doorReachable(prop: GardenProp, player: Cell, facing: Cell): boolean {
  if (prop.height <= 1) return true
  return player.y === prop.y + prop.height && facing.y === prop.y + prop.height - 1 && facing.x === player.x
}

/**
 * Текущее задание: сначала познакомиться с Вереском, потом шаги обучения и поручения по очереди.
 * Поручение сначала надо получить у Вереска (если дело ещё не сделано); выполненный, но ещё не рассказанный
 * шаг ведёт обратно к нему.
 */
export function currentObjective(state: GameState, catalog: Catalog): Objective | null {
  const mentor = catalog.mentor
  if (state.mentor.nextDialogue === mentor.intro) return { text: mentor.meetGoal, target: { kind: 'mentor' } }

  const progress = state.mentor.steps.find((s) => !s.acknowledged)
  if (!progress) return null
  // сделанное дело ведёт к Вереску за благодарностью; несделанное без поручения — за поручением
  if (progress.done) return { text: mentor.reportGoal, target: { kind: 'mentor' } }
  if (!progress.offered) return { text: mentor.offerGoal ?? mentor.meetGoal, target: { kind: 'mentor' } }

  const step = mentor.tutorial.find((t) => t.key === progress.key)
  if (!step) return null
  const { hud, prop, tile } = step.target
  // Сажать нечего — сначала в лавку за семенами
  if (tile === 'soil' && !hasSeeds(state, catalog)) {
    return { text: 'Сначала загляните в лавку за семенами', target: { kind: 'hud', key: 'shop' } }
  }
  if (hud) return { text: step.goal, target: { kind: 'hud', key: hud } }
  if (prop) return { text: step.goal, target: { kind: 'prop', key: prop } }
  return { text: step.goal, target: { kind: 'tile', type: tile ?? '' } }
}

/**
 * Точка над целью в логических пикселях (низ знака «!»), или null, если цели нет в саду.
 * Если цель в другой локации (например, Вереск, а игрок в сарае), «!» горит над дверью наружу.
 */
export function markerPoint(target: ObjectiveTarget, map: GardenMap, state: GameState): { x: number; y: number } | null {
  // у кнопок панели свой «!»; у клеток (свободная грядка) метки нет — «!» над случайной грядкой только сбивает
  if (target.kind === 'hud' || target.kind === 'tile') return null
  const here = targetPoint(target, map, state)
  if (here || map.key === HOME) return here
  const exit = map.props.find((p) => p.door?.map === HOME)
  return exit ? { x: (exit.x + exit.width / 2) * TILE, y: exit.y * TILE - 2 } : null
}

function targetPoint(target: ObjectiveTarget, map: GardenMap, state: GameState): { x: number; y: number } | null {
  switch (target.kind) {
    case 'mentor':
      return map.key === HOME ? { x: MENTOR_SPOT.x * TILE + TILE / 2, y: (MENTOR_SPOT.y + 1) * TILE - CHARACTER_HEIGHT - 2 } : null
    case 'prop': {
      const p = map.props.find((prop) => prop.key === target.key)
      return p ? { x: (p.x + p.width / 2) * TILE, y: p.y * TILE - 2 } : null
    }
    case 'tile': {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (tileAt(map, x, y)?.type === target.type && !objectAt(plantsOn(state, map), { x, y })) {
            return { x: x * TILE + TILE / 2, y: y * TILE - 2 }
          }
        }
      }
      return null
    }
    default:
      return null
  }
}

/** Растения на этой локации. */
export function plantsOn(state: GameState, map: GardenMap): GameState['garden']['objects'] {
  return state.garden.objects.filter((o) => o.gardenKey === map.key)
}

/** Всё для поручения готово, но день не тот (ярмарка — в пятницу): житель скажет «не сегодня». */
export function errandWaitsForDay(npc: Npc, state: GameState): boolean {
  const status = npc.errand && state.errands.find((e) => e.key === npc.errand!.key)
  return !!status && status.today === false && errandReady(npc, { ...state, errands: state.errands.map((e) => (e === status ? { ...e, today: true } : e)) })
}

/** Есть ли в клетке то, с чем можно что-то сделать прямо сейчас. */
export function isInteractive(cell: Cell, state: GameState, catalog: Catalog, map: GardenMap): boolean {
  if (isMentor(cell, map) || npcAt(map, cell)) return true
  const prop = propAt(map, cell.x, cell.y)
  if (prop) {
    if ((prop.door && doorOpen(prop.door, state)) || prop.read) return true
    const spot = catalog.spots.find((s) => s.propKey === prop.key)
    if (spot && !state.searchedSpots.includes(spot.key)) return true
    const puzzle = catalog.puzzles.find((p) => p.propKey === prop.key)
    if (puzzle && !state.solvedPuzzles.includes(puzzle.key)) return true
    const recipe = catalog.recipes.find((r) => r.targetObjectKey === prop.key)
    return !!recipe && !state.worldObjects.some((w) => w.objectKey === prop.key)
  }
  // взрослое растение, с которого есть что собрать
  const plant = objectAt(plantsOn(state, map), cell)
  if (plant) return plant.mature && !!catalog.species.find((s) => s.key === plant.speciesKey)?.produceKey
  const tile = tileAt(map, cell.x, cell.y)
  if (tile?.type === 'overgrown') return has(state, WEEDING_TOOLS)
  return !!tile?.plantable && !objectAt(plantsOn(state, map), cell) && hasSeeds(state, catalog)
}

/**
 * Можно ли «потыкать» клетку: у всего, что стоит в локации, есть описание — Вереск, постройки
 * и предметы, растения; пустая грядка — когда есть что посадить, заросшая — когда есть чем полоть.
 * Трава, тропа, пол и стены молчат. Подойдёшь к такому — загорится «!», нажмёшь — откроется описание.
 */
export function isClickable(cell: Cell, state: GameState, catalog: Catalog, map: GardenMap): boolean {
  if (isMentor(cell, map) || npcAt(map, cell)) return true
  if (objectAt(plantsOn(state, map), cell)) return true
  if (propAt(map, cell.x, cell.y)) return true
  return isInteractive(cell, state, catalog, map)
}

/** Одна ли это вещь: та же клетка или клетки одной постройки (сарай занимает 4×3). */
export function sameThing(a: Cell, b: Cell, map: GardenMap): boolean {
  if (a.x === b.x && a.y === b.y) return true
  const prop = propAt(map, a.x, a.y)
  return !!prop && prop === propAt(map, b.x, b.y)
}

/** Стоит ли персонаж вплотную к вещи (по соседней клетке с любой её клеткой), куда бы ни смотрел. */
export function isNear(cell: Cell, at: Cell, map: GardenMap): boolean {
  const prop = propAt(map, cell.x, cell.y)
  const cells = prop
    ? Array.from({ length: prop.width * prop.height }, (_, i) => ({ x: prop.x + (i % prop.width), y: prop.y + Math.floor(i / prop.width) }))
    : [cell]
  return cells.some((c) => Math.abs(c.x - at.x) + Math.abs(c.y - at.y) === 1)
}

/** Клетка, в которой нарисован «!» над объектом, — по ней тоже можно нажать. */
export function promptCell(cell: Cell, map: GardenMap): Cell {
  const p = promptPoint(cell, map)
  return { x: Math.floor(p.x / TILE), y: Math.floor((p.y - 8) / TILE) }
}

/** Где рисовать «!» над клеткой: над головой персонажа, над постройкой или над самой клеткой. */
export function promptPoint(cell: Cell, map: GardenMap): { x: number; y: number } {
  if (isMentor(cell, map)) {
    return { x: cell.x * TILE + TILE / 2, y: (cell.y + 1) * TILE - CHARACTER_HEIGHT }
  }
  // житель-человек ростом с героя — «!» над головой; мышь маленькая — прямо над ушами
  const npc = npcAt(map, cell)
  if (npc?.appearance) return { x: cell.x * TILE + TILE / 2, y: (cell.y + 1) * TILE - CHARACTER_HEIGHT }
  // большие кошки Светлолесья — над головой (кадр высотой 56)
  if (npc && BIG_CREATURES.has(npc.kind)) return { x: cell.x * TILE + TILE / 2, y: (cell.y + 1) * TILE - 58 }
  if (npc) return { x: cell.x * TILE + TILE / 2, y: (cell.y + 1) * TILE - 26 }
  const prop = propAt(map, cell.x, cell.y)
  if (prop) return { x: (prop.x + prop.width / 2) * TILE, y: prop.y * TILE }
  return { x: cell.x * TILE + TILE / 2, y: cell.y * TILE + 4 }
}

/** Можно ли выполнить поручение жителя прямо сейчас: взято, не сделано, всё нужное есть. */
export function errandReady(npc: Npc, state: GameState): boolean {
  const errand = npc.errand
  const status = errand && state.errands.find((e) => e.key === errand.key)
  if (!errand || !status?.offered || status.done || status.today === false) return false
  const have = (key: string) => state.inventory.find((e) => e.itemKey === key)?.quantity ?? 0
  if (errand.kind === 'SHOW') return state.searchedSpots.includes(errand.spot ?? '')
  if (errand.kind === 'GLOW') return glowLit(state.glow)
  if (errand.kind === 'BEACON') return beaconEnough(state.beacon)
  if (errand.kind === 'REVIVE') return (errand.props ?? []).every((key) => state.worldObjects.some((w) => w.objectKey === key))
  return (errand.give ?? []).every((g) => have(g.itemKey) >= g.quantity)
}
