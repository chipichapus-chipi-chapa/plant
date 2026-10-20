import { describe, expect, it } from 'vitest'
import type { GardenMap } from '../api/types'
import { blockedCells, cellOf, collides, facingCell, walk, walkerAt } from './movement'

const t = (type: string) => ({ type, name: type, description: '', plantable: type === 'soil' })

// 5×4: забор по краю, внутри трава, грядка и сарай-постройка
const map: GardenMap = {
  key: 'test',
  name: 'Тест',
  width: 5,
  height: 4,
  tiles: { '#': t('fence'), '.': t('grass'), s: t('soil') },
  rows: ['#####', '#..s#', '#...#', '#####'],
  props: [{ key: 'shed', kind: 'shed', x: 2, y: 2, width: 1, height: 1, name: 'Сарай', description: '' }],
}

describe('проходимость', () => {
  const blocked = blockedCells(map, [], [])

  it('забор и постройки непроходимы, трава и пустая грядка — да', () => {
    expect(blocked[0][0]).toBe(true)
    expect(blocked[2][2]).toBe(true) // сарай
    expect(blocked[1][1]).toBe(false)
    expect(blocked[1][3]).toBe(false) // грядка
  })

  it('растения и стоящие персонажи загораживают клетку', () => {
    const withPlant = blockedCells(
      map,
      [{ gardenKey: 'home', x: 3, y: 1, kind: 'PLANT', speciesKey: 'radish', plantedAt: '', stage: 0, stageCount: 3, mature: false, nextStageAt: null }],
      [{ x: 1, y: 2 }],
    )
    expect(withPlant[1][3]).toBe(true)
    expect(withPlant[2][1]).toBe(true)
  })
})

describe('ходьба', () => {
  const blocked = blockedCells(map, [], [])

  it('идёт вправо и смотрит вправо', () => {
    const w = walk(walkerAt({ x: 1, y: 1 }), 1, 0, 0.1, blocked)
    expect(w.x).toBeGreaterThan(walkerAt({ x: 1, y: 1 }).x)
    expect(w.facing).toBe('right')
  })

  it('не проходит сквозь забор', () => {
    let w = walkerAt({ x: 1, y: 1 })
    for (let i = 0; i < 50; i++) w = walk(w, -1, 0, 0.05, blocked)
    expect(cellOf(w)).toEqual({ x: 1, y: 1 })
    expect(collides(blocked, w.x, w.y)).toBe(false)
  })

  it('по диагонали скользит вдоль препятствия', () => {
    let w = walkerAt({ x: 1, y: 1 })
    for (let i = 0; i < 20; i++) w = walk(w, 1, -1, 0.05, blocked) // вверх — забор, вправо — свободно
    expect(w.x).toBeGreaterThan(walkerAt({ x: 1, y: 1 }).x)
    expect(cellOf(w).y).toBe(1)
  })

  it('выходит с грядки, если прямо под ногами посадили растение', () => {
    const sprout = { x: 3, y: 1 } as never // растение в клетке, где стоит персонаж
    const withPlant = blockedCells(map, [sprout], [])
    let w = walkerAt({ x: 3, y: 1 })
    expect(collides(withPlant, w.x, w.y)).toBe(true)
    for (let i = 0; i < 20; i++) w = walk(w, 0, 1, 0.05, withPlant)
    expect(cellOf(w)).toEqual({ x: 3, y: 2 })
    expect(collides(withPlant, w.x, w.y)).toBe(false)
  })

  it('слабый наклон джойстика не двигает персонажа', () => {
    const start = walkerAt({ x: 1, y: 1 })
    expect(walk(start, 0.1, 0, 1, blocked)).toBe(start)
  })

  it('видит клетку перед собой', () => {
    expect(facingCell({ ...walkerAt({ x: 1, y: 1 }), facing: 'right' })).toEqual({ x: 2, y: 1 })
    expect(facingCell({ ...walkerAt({ x: 1, y: 1 }), facing: 'down' })).toEqual({ x: 1, y: 2 })
  })
})
