import { describe, expect, it } from 'vitest'
import type { GardenMap } from '../api/types'
import { cellAtPoint, describeCell, fitScale, propAt, tileFrame, variant } from './layout'

const t = (type: string, plantable = false) => ({ type, name: type, description: '', plantable })

const map: GardenMap = {
  key: 'test',
  name: 'Тест',
  width: 4,
  height: 3,
  tiles: { '#': t('fence'), '.': t('grass'), s: t('soil', true), g: t('gate') },
  rows: ['####', '#s.g', '####'],
  props: [{ key: 'shed', kind: 'shed', x: 2, y: 1, width: 1, height: 1, name: 'Сарай', description: 'Старый' }],
}

describe('tileFrame', () => {
  it('выбирает кусок забора по соседям', () => {
    expect(tileFrame(map, 1, 0)).toBe('fence_h')
    expect(tileFrame(map, 0, 0)).toBe('fence_post') // угол: соседи и справа, и снизу
    expect(tileFrame(map, 3, 1)).toBe('gate')
  })

  it('берёт вариант тайла стабильно', () => {
    expect(tileFrame(map, 1, 1)).toBe(tileFrame(map, 1, 1))
    expect(tileFrame(map, 1, 1)).toMatch(/^soil_[01]$/)
  })
})

describe('variant', () => {
  it('всегда в диапазоне и детерминирован', () => {
    for (let x = 0; x < 20; x++) {
      const v = variant(x, 7, 4)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(4)
      expect(variant(x, 7, 4)).toBe(v)
    }
  })
})

describe('геометрия', () => {
  it('переводит точку в клетку с учётом масштаба', () => {
    expect(cellAtPoint(70, 10, 2)).toEqual({ x: 1, y: 0 })
    expect(cellAtPoint(63.9, 64, 2)).toEqual({ x: 0, y: 1 })
  })

  it('подбирает целый масштаб от 1 до 3, если сад влезает', () => {
    expect(fitScale(128, map)).toBe(1) // карта 128 px шириной
    expect(fitScale(300, map)).toBe(2)
    expect(fitScale(5000, map)).toBe(3)
  })

  it('на узком экране уменьшает дробно, без горизонтальной прокрутки', () => {
    expect(fitScale(96, map)).toBe(0.75)
  })
})

describe('describeCell', () => {
  it('постройка важнее тайла под ней', () => {
    expect(propAt(map, 2, 1)?.key).toBe('shed')
    expect(describeCell(map, { x: 2, y: 1 })).toMatchObject({ name: 'Сарай' })
  })

  it('сообщает, можно ли сажать', () => {
    expect(describeCell(map, { x: 1, y: 1 })).toMatchObject({ plantable: true })
    expect(describeCell(map, { x: 9, y: 9 })).toBeNull()
  })
})
