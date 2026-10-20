import { describe, expect, it } from 'vitest'
import type { Catalog, GameState, GardenMap } from '../api/types'
import { currentObjective, doorOpen, isClickable, isInteractive, isNear, markerPoint, npcAt, promptCell, sameThing, doorReachable } from './guidance'

const map = {
  key: 'home',
  name: 'Сад',
  width: 4,
  height: 2,
  tiles: {
    '.': { type: 'grass', name: '', description: '', plantable: false },
    s: { type: 'soil', name: '', description: '', plantable: true },
    S: { type: 'overgrown', name: '', description: '', plantable: false },
  },
  rows: ['..ss', '...S'],
  props: [{ key: 'rock-2', kind: 'rock', x: 0, y: 1, width: 1, height: 1, name: '', description: '' }],
}

// сарай изнутри: дверь наружу в (1,1)
const shed: GardenMap = {
  key: 'shed',
  name: 'Сарай',
  width: 3,
  height: 2,
  tiles: { '.': { type: 'floor', name: '', description: '', plantable: false } },
  rows: ['...', '...'],
  props: [{ key: 'exit', kind: 'door_exit', x: 1, y: 1, width: 1, height: 1, name: '', description: '', door: { map: 'home', x: 0, y: 0, facing: 'down', label: 'Выйти' } }],
}

const catalog = {
  garden: map,
  locations: [map, shed],
  puzzles: [],
  items: [{ key: 'seed_radish', kind: 'SEED', name: '', description: '', price: 2, speciesKey: 'radish', crystalCategory: null }],
  spots: [{ key: 'rock_cache', propKey: 'rock-2' }],
  recipes: [],
  mentor: {
    intro: 'intro',
    meetGoal: 'Поговорите',
    reportGoal: 'Расскажите',
    offerGoal: 'Вереск хочет попросить',
    tutorial: [
      { key: 'create_habit', goal: 'Запишите дело', target: { hud: 'habits', prop: null, tile: null } },
      { key: 'plant', goal: 'Посадите', target: { hud: null, prop: null, tile: 'soil' } },
      { key: 'inspect', goal: 'Осмотрите', target: { hud: null, prop: 'rock-2', tile: null } },
      { key: 'weed', goal: 'Прополите', target: { hud: null, prop: null, tile: 'overgrown' }, offer: 'offer_weed' },
    ],
  },
} as unknown as Catalog

const state = (patch: Partial<GameState>): GameState =>
  ({
    inventory: [],
    garden: { objects: [], weeded: [] },
    searchedSpots: [],
    solvedPuzzles: [],
    worldObjects: [],
    mentor: { nextDialogue: null, hasNews: false, steps: [] },
    ...patch,
  }) as unknown as GameState

const steps = (...s: [string, boolean, boolean, boolean?][]) =>
  s.map(([key, done, acknowledged, offered = true]) => ({ key, done, acknowledged, offered }))

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

  it('поручение сначала надо получить у Вереска', () => {
    const s = state({ mentor: { nextDialogue: 'offer_weed', hasNews: true, steps: steps(['weed', false, false, false]) } })
    expect(currentObjective(s, catalog)).toEqual({ text: 'Вереск хочет попросить', target: { kind: 'mentor' } })
  })

  it('дело, сделанное до поручения, сразу ведёт к Вереску за благодарностью', () => {
    const s = state({ mentor: { nextDialogue: 'done_weed', hasNews: true, steps: steps(['weed', true, false, false]) } })
    expect(currentObjective(s, catalog)).toEqual({ text: 'Расскажите', target: { kind: 'mentor' } })
  })

  it('после обучения заданий нет', () => {
    const s = state({ mentor: { nextDialogue: null, hasNews: false, steps: steps(['create_habit', true, true]) } })
    expect(currentObjective(s, catalog)).toBeNull()
  })
})

describe('знаки «!»', () => {
  it('над клетками-целями (свободная грядка) метки нет — только над предметами и Вереском', () => {
    expect(markerPoint({ kind: 'tile', type: 'soil' }, map, state({}))).toBeNull()
    expect(markerPoint({ kind: 'prop', key: 'rock-2' }, map, state({}))).toEqual({ x: 16, y: 30 })
  })

  it('если цель снаружи, а игрок в сарае, «!» горит над дверью', () => {
    expect(markerPoint({ kind: 'mentor' }, shed, state({}))).toEqual({ x: 1.5 * 32, y: 30 })
  })

  it('заросшую грядку можно прополоть, только когда есть инструменты', () => {
    expect(isInteractive({ x: 3, y: 1 }, state({}), catalog, map)).toBe(false)
    expect(isInteractive({ x: 3, y: 1 }, state({ inventory: [{ itemKey: 'garden_tools', quantity: 1 }] }), catalog, map)).toBe(true)
  })

  it('у двери всегда «!»', () => {
    expect(isInteractive({ x: 1, y: 1 }, state({}), catalog, shed)).toBe(true)
  })

  it('«!» загорается у неосмотренного тайника и свободной грядки (если есть семена)', () => {
    expect(isInteractive({ x: 0, y: 1 }, state({}), catalog, map)).toBe(true)
    expect(isInteractive({ x: 0, y: 1 }, state({ searchedSpots: ['rock_cache'] }), catalog, map)).toBe(false)
    expect(isInteractive({ x: 2, y: 0 }, state({}), catalog, map)).toBe(false)
    expect(isInteractive({ x: 2, y: 0 }, state({ inventory: [{ itemKey: 'seed_radish', quantity: 1 }] }), catalog, map)).toBe(true)
    expect(isInteractive({ x: 1, y: 1 }, state({}), catalog, map)).toBe(false)
  })

  it('описание есть у всего, что стоит в саду: тайник (и после поиска), растение, грядка с семенами', () => {
    expect(isClickable({ x: 0, y: 1 }, state({ searchedSpots: ['rock_cache'] }), catalog, map)).toBe(true)
    expect(isClickable({ x: 2, y: 0 }, state({ garden: { objects: [{ gardenKey: map.key, x: 2, y: 0 } as never], weeded: [] } }), catalog, map)).toBe(true)
    expect(isClickable({ x: 2, y: 0 }, state({ inventory: [{ itemKey: 'seed_radish', quantity: 1 }] }), catalog, map)).toBe(true)
    // пустая грядка без семян и простая трава — без таблички
    expect(isClickable({ x: 2, y: 0 }, state({}), catalog, map)).toBe(false)
    expect(isClickable({ x: 1, y: 1 }, state({}), catalog, map)).toBe(false)
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

  it('калитка в ежевике пускает, только когда её пробудили', () => {
    const door = { map: 'east', x: 1, y: 6, facing: 'right' as const, label: 'На тропу', requires: 'east-gate' }
    expect(doorOpen(door, state({}))).toBe(false)
    expect(doorOpen(door, state({ worldObjects: [{ objectKey: 'east-gate', state: 'AWAKENED' }] }))).toBe(true)
    expect(doorOpen({ ...door, requires: null }, state({}))).toBe(true)
  })

  it('с мышью можно поговорить — над ней «!»', () => {
    const glade: GardenMap = { ...shed, key: 'east', npcs: [{ key: 'krupka', name: 'Крупка', kind: 'krupka', x: 0, y: 0, description: '', talks: ['hi'], dialogues: {} }] }
    expect(npcAt(glade, { x: 0, y: 0 })?.key).toBe('krupka')
    expect(isInteractive({ x: 0, y: 0 }, state({}), catalog, glade)).toBe(true)
    expect(isClickable({ x: 2, y: 0 }, state({}), catalog, glade)).toBe(false)
  })
})

describe('двери', () => {
  const shed = { key: 'shed', kind: 'shed', x: 11, y: 1, width: 4, height: 3, name: 'Сарай', description: '' }
  const gate = { key: 'gate', kind: 'gate', x: 0, y: 6, width: 1, height: 1, name: 'Калитка', description: '' }

  it('в постройку входят только спереди — снизу, лицом к стене', () => {
    expect(doorReachable(shed, { x: 12, y: 4 }, { x: 12, y: 3 })).toBe(true)
    expect(doorReachable(shed, { x: 10, y: 2 }, { x: 11, y: 2 })).toBe(false) // со стены сбоку
    expect(doorReachable(shed, { x: 12, y: 0 }, { x: 12, y: 1 })).toBe(false) // сзади
  })

  it('калитку и лодку можно открыть с любой стороны', () => {
    expect(doorReachable(gate, { x: 1, y: 6 }, { x: 0, y: 6 })).toBe(true)
    expect(doorReachable(gate, { x: 0, y: 5 }, { x: 0, y: 6 })).toBe(true)
  })
})
