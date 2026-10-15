import { describe, expect, it } from 'vitest'
import type { GardenMap, GardenObject } from '../api/types'
import { cellAtPoint, describeCell, fitScale, minutesUntilNextStage, nextGrowthRefresh, objectAt, propAt, tileFrame, variant } from './layout'

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
    expect(tileFrame(map, 3, 1)).toBe('prop_gate')
  })

  it('выбирает край грядки по соседям', () => {
    // одиночная грядка: соседей-грядок нет ни с одной стороны
    expect(tileFrame(map, 1, 1)).toBe('soil_0')
    const wide = { ...map, rows: ['####', '#ss#', '####'] }
    expect(tileFrame(wide, 1, 1)).toBe('soil_2') // сосед справа
    expect(tileFrame(wide, 2, 1)).toBe('soil_8') // сосед слева
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

  it('заполняет доступную ширину, но не больше ×3', () => {
    expect(fitScale(128, map)).toBe(1) // карта 128 px шириной
    expect(fitScale(224, map)).toBe(1.75)
    expect(fitScale(5000, map)).toBe(3)
  })

  it('учитывает высоту, чтобы под садом оставалось место для кнопок', () => {
    expect(fitScale(5000, map, 192)).toBe(2) // карта 96 px высотой
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

const plant = (x: number, nextStageAt: string | null): GardenObject => ({
  x,
  y: 1,
  kind: 'PLANT',
  speciesKey: 'radish',
  plantedAt: '2026-10-15T10:00:00Z',
  stage: nextStageAt ? 0 : 2,
  stageCount: 3,
  mature: nextStageAt === null,
  nextStageAt,
})

describe('рост', () => {
  const now = Date.parse('2026-10-15T10:00:00Z')

  it('находит растение в клетке', () => {
    expect(objectAt([plant(1, null)], { x: 1, y: 1 })?.speciesKey).toBe('radish')
    expect(objectAt([plant(1, null)], { x: 2, y: 1 })).toBeUndefined()
  })

  it('считает минуты до следующей стадии с округлением вверх', () => {
    expect(minutesUntilNextStage(plant(1, '2026-10-15T10:09:01Z'), now)).toBe(10)
    expect(minutesUntilNextStage(plant(1, '2026-10-15T09:59:00Z'), now)).toBe(1)
    expect(minutesUntilNextStage(plant(1, null), now)).toBeNull()
  })

  it('планирует обновление к ближайшей смене стадии', () => {
    expect(nextGrowthRefresh([plant(1, '2026-10-15T10:05:00Z'), plant(2, '2026-10-15T10:02:00Z')], now)).toBe(120_500)
    expect(nextGrowthRefresh([plant(1, null)], now)).toBeNull()
  })
})
