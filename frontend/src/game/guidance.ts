// Подсказки игроку: текущее задание от Вереска, над чьей целью покачивается «!»,
// и с чем рядом можно взаимодействовать (тогда над объектом загорается «!»).
// Всё считается для текущей локации (map): сад, сарай изнутри…

import type { Catalog, GameState, GardenMap } from '../api/types'
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

/**
 * Текущее задание: сначала познакомиться с Вереском, потом шаги обучения и поручения по очереди.
 * Поручение сначала надо получить у Вереска; выполненный, но ещё не рассказанный шаг ведёт обратно к нему.
 */
export function currentObjective(state: GameState, catalog: Catalog): Objective | null {
  const mentor = catalog.mentor
  if (state.mentor.nextDialogue === mentor.intro) return { text: mentor.meetGoal, target: { kind: 'mentor' } }

  const progress = state.mentor.steps.find((s) => !s.acknowledged)
  if (!progress) return null
  if (!progress.offered) return { text: mentor.offerGoal ?? mentor.meetGoal, target: { kind: 'mentor' } }
  if (progress.done) return { text: mentor.reportGoal, target: { kind: 'mentor' } }

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
  if (target.kind === 'hud') return null
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
          if (tileAt(map, x, y)?.type === target.type && !objectAt(state.garden.objects, { x, y })) {
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

/** Есть ли в клетке то, с чем можно что-то сделать прямо сейчас. */
export function isInteractive(cell: Cell, state: GameState, catalog: Catalog, map: GardenMap): boolean {
  if (isMentor(cell, map)) return true
  const prop = propAt(map, cell.x, cell.y)
  if (prop) {
    if (prop.door || prop.read) return true
    const spot = catalog.spots.find((s) => s.propKey === prop.key)
    if (spot && !state.searchedSpots.includes(spot.key)) return true
    const puzzle = catalog.puzzles.find((p) => p.propKey === prop.key)
    if (puzzle && !state.solvedPuzzles.includes(puzzle.key)) return true
    const recipe = catalog.recipes.find((r) => r.targetObjectKey === prop.key)
    return !!recipe && !state.worldObjects.some((w) => w.objectKey === prop.key)
  }
  const tile = tileAt(map, cell.x, cell.y)
  if (tile?.type === 'overgrown') return has(state, WEEDING_TOOLS)
  return !!tile?.plantable && !objectAt(state.garden.objects, cell) && hasSeeds(state, catalog)
}

/**
 * Можно ли «потыкать» клетку: у всего, что стоит в локации, есть описание — Вереск, постройки
 * и предметы, растения; пустая грядка — когда есть что посадить, заросшая — когда есть чем полоть.
 * Трава, тропа, пол и стены молчат. Подойдёшь к такому — загорится «!», нажмёшь — откроется описание.
 */
export function isClickable(cell: Cell, state: GameState, catalog: Catalog, map: GardenMap): boolean {
  if (isMentor(cell, map)) return true
  if (map.key === HOME && objectAt(state.garden.objects, cell)) return true
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
  const prop = propAt(map, cell.x, cell.y)
  if (prop) return { x: (prop.x + prop.width / 2) * TILE, y: prop.y * TILE }
  return { x: cell.x * TILE + TILE / 2, y: cell.y * TILE + 4 }
}
