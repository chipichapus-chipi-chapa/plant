// Подсказки игроку: текущее задание от Вереска, куда указывает стрелка,
// и с чем рядом можно взаимодействовать (тогда над объектом загорается «!»).

import type { Catalog, GameState, GardenMap } from '../api/types'
import { MENTOR_SPOT, objectAt, propAt, TILE, tileAt, type Cell } from './layout'
import { CHARACTER_HEIGHT } from './renderer'

export type ObjectiveTarget =
  | { kind: 'mentor' }
  | { kind: 'hud'; key: string }
  | { kind: 'prop'; key: string }
  | { kind: 'tile'; type: string }

export type Objective = { text: string; target: ObjectiveTarget }

const hasSeeds = (state: GameState, catalog: Catalog) =>
  catalog.items.some((i) => i.kind === 'SEED' && (state.inventory.find((e) => e.itemKey === i.key)?.quantity ?? 0) > 0)

/**
 * Текущее задание: сначала познакомиться с Вереском, потом шаги обучения по очереди.
 * Выполненный, но ещё не рассказанный шаг ведёт обратно к Вереску. После обучения заданий нет.
 */
export function currentObjective(state: GameState, catalog: Catalog): Objective | null {
  const mentor = catalog.mentor
  if (state.mentor.nextDialogue === mentor.intro) return { text: mentor.meetGoal, target: { kind: 'mentor' } }

  const progress = state.mentor.steps.find((s) => !s.acknowledged)
  if (!progress) return null
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

/** Точка над целью в логических пикселях (низ стрелки), или null, если цель не в саду. */
export function markerPoint(target: ObjectiveTarget, map: GardenMap, state: GameState): { x: number; y: number } | null {
  switch (target.kind) {
    case 'mentor':
      return { x: MENTOR_SPOT.x * TILE + TILE / 2, y: (MENTOR_SPOT.y + 1) * TILE - CHARACTER_HEIGHT - 2 }
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
export function isInteractive(cell: Cell, state: GameState, catalog: Catalog): boolean {
  if (cell.x === MENTOR_SPOT.x && cell.y === MENTOR_SPOT.y) return true
  const map = catalog.garden
  const prop = propAt(map, cell.x, cell.y)
  if (prop) {
    const spot = catalog.spots.find((s) => s.propKey === prop.key)
    if (spot && !state.searchedSpots.includes(spot.key)) return true
    const recipe = catalog.recipes.find((r) => r.targetObjectKey === prop.key)
    return !!recipe && !state.worldObjects.some((w) => w.objectKey === prop.key)
  }
  return !!tileAt(map, cell.x, cell.y)?.plantable && !objectAt(state.garden.objects, cell) && hasSeeds(state, catalog)
}

/** Где рисовать «!» над клеткой: над головой персонажа, над постройкой или над самой клеткой. */
export function promptPoint(cell: Cell, map: GardenMap): { x: number; y: number } {
  if (cell.x === MENTOR_SPOT.x && cell.y === MENTOR_SPOT.y) {
    return { x: cell.x * TILE + TILE / 2, y: (cell.y + 1) * TILE - CHARACTER_HEIGHT }
  }
  const prop = propAt(map, cell.x, cell.y)
  if (prop) return { x: (prop.x + prop.width / 2) * TILE, y: prop.y * TILE }
  return { x: cell.x * TILE + TILE / 2, y: cell.y * TILE + 4 }
}
