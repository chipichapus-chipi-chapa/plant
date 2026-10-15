import { describe, expect, it } from 'vitest'
import type { HabitHistory } from '../../api/types'
import { countsPerDay, dayState, isCurrentMonth, leadingBlanks, monthTitle, shiftMonth, weekBand } from './trackerModel'

const history: HabitHistory = {
  month: '2026-10',
  daysInMonth: 31,
  today: '2026-10-15',
  editableFrom: '2026-08-14',
  habits: [
    { id: 1, title: 'Читать', crystalCategory: 'emerald', days: [1, 3, 15] },
    { id: 2, title: 'Гулять', crystalCategory: null, days: [3] },
  ],
}

describe('trackerModel', () => {
  it('называет месяц и листает через год', () => {
    expect(monthTitle('2026-10')).toBe('Октябрь 2026')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('делит месяц на «недели» по 7 дней', () => {
    expect([1, 7, 8, 14, 15, 29, 31].map(weekBand)).toEqual([0, 0, 1, 1, 2, 4, 4])
  })

  it('считает пустые клетки календаря с понедельника', () => {
    expect(leadingBlanks('2026-10')).toBe(3) // 1 октября 2026 — четверг
    expect(leadingBlanks('2026-06')).toBe(0) // 1 июня 2026 — понедельник
  })

  it('определяет, какие дни можно отмечать', () => {
    expect(dayState(history, 16)).toBe('future')
    expect(dayState(history, 15)).toBe('today')
    expect(dayState(history, 1)).toBe('past')
    expect(dayState({ ...history, month: '2026-08' }, 13)).toBe('locked')
  })

  it('считает отметки по дням', () => {
    const counts = countsPerDay(history)
    expect(counts).toHaveLength(31)
    expect(counts[2]).toBe(2)
    expect(counts[14]).toBe(1)
    expect(counts[1]).toBe(0)
  })

  it('знает, что месяц текущий', () => {
    expect(isCurrentMonth(history)).toBe(true)
    expect(isCurrentMonth({ ...history, month: '2026-09' })).toBe(false)
  })
})
