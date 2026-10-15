// Чистая логика месячного трекера: даты, недели, подсчёты. Без DOM — легко тестировать.

import type { HabitHistory } from '../../api/types'

export const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export function monthTitle(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return `${MONTHS[m - 1]} ${year}`
}

/** Соседний месяц в формате yyyy-MM. */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(year, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function isoDay(month: string, day: number): string {
  return `${month}-${String(day).padStart(2, '0')}`
}

/** Номер «недели» трекера 0..4: дни 1–7, 8–14, … — как на бумажных трекерах. */
export function weekBand(day: number): number {
  return Math.floor((day - 1) / 7)
}

/** Сколько пустых клеток перед 1-м числом в календаре с понедельника. */
export function leadingBlanks(month: string): number {
  const [year, m] = month.split('-').map(Number)
  return (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7
}

export type DayState = 'future' | 'locked' | 'today' | 'past'

/** Что можно сделать с клеткой дня: будущее и слишком давнее закрыты. Даты в ISO сравниваются как строки. */
export function dayState(history: HabitHistory, day: number): DayState {
  const date = isoDay(history.month, day)
  if (date > history.today) return 'future'
  if (date === history.today) return 'today'
  if (date < history.editableFrom) return 'locked'
  return 'past'
}

/** Сколько привычек отмечено в каждый день месяца (индекс 0 — 1-е число). */
export function countsPerDay(history: HabitHistory): number[] {
  const counts = new Array<number>(history.daysInMonth).fill(0)
  for (const habit of history.habits) for (const day of habit.days) counts[day - 1]++
  return counts
}

/** Месяц текущий (содержит сегодня) — дальше листать нельзя. */
export function isCurrentMonth(history: HabitHistory): boolean {
  return history.today.startsWith(history.month)
}
