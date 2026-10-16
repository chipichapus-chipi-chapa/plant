import { describe, expect, it } from 'vitest'
import type { Catalog, GameState } from '../api/types'
import { currentObjective, isClickable, isInteractive, isNear, markerPoint, promptCell, sameThing } from './guidance'

const map = {
  key: 'home',
  name: 'Сад',
  width: 4,
  height: 2,
  tiles: {
    '.': { type: 'grass', name: '', description: '', plantable: false },
    s: { type: 'soil', name: '', description: '', plantable: true },
  },
  rows: ['..ss', '....'],
  props: [{ key: 'rock-2', kind: 'rock', x: 0, y: 1, width: 1, height: 1, name: '', description: '' }],
}

const catalog = {
  garden: map,
  items: [{ key: 'seed_radish', kind: 'SEED', name: '', description: '', price: 2, speciesKey: 'radish', crystalCategory: null }],
  spots: [{ key: 'rock_cache', propKey: 'rock-2' }],
  recipes: [],
  mentor: {
    intro: 'intro',
    meetGoal: 'Поговорите',
    reportGoal: 'Расскажите',
    tutorial: [
      { key: 'create_habit', goal: 'Запишите дело', target: { hud: 'habits', prop: null, tile: null } },
      { key: 'plant', goal: 'Посадите', target: { hud: null, prop: null, tile: 'soil' } },
      { key: 'inspect', goal: 'Осмотрите', target: { hud: null, prop: 'rock-2', tile: null } },
    ],
  },
} as unknown as Catalog

const state = (patch: Partial<GameState>): GameState =>
  ({
    inventory: [],
    garden: { objects: [] },
    searchedSpots: [],
    worldObjects: [],
    mentor: { nextDialogue: null, hasNews: false, steps: [] },
    ...patch,
  }) as unknown as GameState

const steps = (...s: [string, boolean, boolean][]) => s.map(([key, done, acknowledged]) => ({ key, done, acknowledged }))

describe('задание от Вереска', () => {
  it('сначала — познакомиться', () => {
    const o = currentObjective(state({ mentor: { nextDialogue: 'intro', hasNews: true, steps: [] } }), catalog)
    expect(o).toEqual({ text: 'Поговорите', target: { kind: 'mentor' } })
  })

  it('ведёт на кнопку панели для привычек', () => {
    const o = currentObjective(state({ mentor: { nextDialogue: 'hint', hasNews: false, steps: steps(['create_habit', false, false]) } }), catalog)
    expect(o?.target).toEqual({ kind: 'hud', key: 'habits' })
  })

  it('выполненный шаг возвращает к Вереску', () => {
    const o = currentObjective(state({ mentor: { nextDialogue: 'done', hasNews: true, steps: steps(['create_habit', true, false]) } }), catalog)
    expect(o).toEqual({ text: 'Расскажите', target: { kind: 'mentor' } })
  })

  it('без семян посадка сначала ведёт в лавку', () => {
    const s = state({ mentor: { nextDialogue: 'h', hasNews: false, steps: steps(['create_habit', true, true], ['plant', false, false]) } })
    expect(currentObjective(s, catalog)?.target).toEqual({ kind: 'hud', key: 'shop' })
    const withSeeds = { ...s, inventory: [{ itemKey: 'seed_radish', quantity: 1 }] }
    expect(currentObjective(withSeeds, catalog)?.target).toEqual({ kind: 'tile', type: 'soil' })
  })

  it('после обучения заданий нет', () => {
    const s = state({ mentor: { nextDialogue: null, hasNews: false, steps: steps(['create_habit', true, true]) } })
    expect(currentObjective(s, catalog)).toBeNull()
  })
})

describe('стрелка и «!»', () => {
  it('стрелка указывает на первую свободную грядку', () => {
    const s = state({ garden: { objects: [{ x: 2, y: 0 } as never] } })
    expect(markerPoint({ kind: 'tile', type: 'soil' }, map, s)).toEqual({ x: 3 * 32 + 16, y: -2 })
  })

  it('«!» загорается у неосмотренного тайника и свободной грядки (если есть семена)', () => {
    expect(isInteractive({ x: 0, y: 1 }, state({}), catalog)).toBe(true)
    expect(isInteractive({ x: 0, y: 1 }, state({ searchedSpots: ['rock_cache'] }), catalog)).toBe(false)
    expect(isInteractive({ x: 2, y: 0 }, state({}), catalog)).toBe(false)
    expect(isInteractive({ x: 2, y: 0 }, state({ inventory: [{ itemKey: 'seed_radish', quantity: 1 }] }), catalog)).toBe(true)
    expect(isInteractive({ x: 1, y: 1 }, state({}), catalog)).toBe(false)
  })

  it('описание есть у всего, что стоит в саду: тайник (и после поиска), растение, грядка с семенами', () => {
    expect(isClickable({ x: 0, y: 1 }, state({ searchedSpots: ['rock_cache'] }), catalog)).toBe(true)
    expect(isClickable({ x: 2, y: 0 }, state({ garden: { objects: [{ x: 2, y: 0 } as never] } }), catalog)).toBe(true)
    expect(isClickable({ x: 2, y: 0 }, state({ inventory: [{ itemKey: 'seed_radish', quantity: 1 }] }), catalog)).toBe(true)
    // пустая грядка без семян и простая трава — без таблички
    expect(isClickable({ x: 2, y: 0 }, state({}), catalog)).toBe(false)
    expect(isClickable({ x: 1, y: 1 }, state({}), catalog)).toBe(false)
  })

  it('нажатие по «!» над объектом — то же, что по объекту', () => {
    // камни в (0,1): «!» рисуется над ними, в клетке (0,0)
    expect(promptCell({ x: 0, y: 1 }, map)).toEqual({ x: 0, y: 0 })
    expect(sameThing({ x: 0, y: 1 }, { x: 0, y: 1 }, map)).toBe(true)
    expect(sameThing({ x: 0, y: 1 }, { x: 1, y: 1 }, map)).toBe(false)
    // вплотную — по соседней клетке, по диагонали уже далеко
    expect(isNear({ x: 0, y: 1 }, { x: 1, y: 1 }, map)).toBe(true)
    expect(isNear({ x: 0, y: 1 }, { x: 1, y: 0 }, map)).toBe(false)
  })
})
