import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import {
  archiveHabit,
  completeHabitOn,
  createHabit,
  fetchHabitHistory,
  uncompleteHabitOn,
  updateHabit,
} from '../../api/game'
import type { Catalog, GameState, HabitHistory, HabitInput } from '../../api/types'
import { describeReward } from '../../lib/rewards'
import { Button } from '../../ui/Button'
import { CrystalIcon } from '../../ui/icons/CrystalIcon'
import { useToast } from '../notifications/Toasts'
import { HabitForm } from './HabitForm'
import styles from './HabitTracker.module.css'
import {
  countsPerDay,
  dayState,
  isCurrentMonth,
  isoDay,
  leadingBlanks,
  monthTitle,
  shiftMonth,
  weekBand,
  WEEKDAYS,
} from './trackerModel'

type Props = {
  state: GameState
  catalog: Catalog
  /** Перечитать состояние игры (баланс, привычки) после изменения */
  onChanged: () => Promise<void>
}

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; history: HabitHistory }

type Mode = { kind: 'idle' } | { kind: 'create' } | { kind: 'edit'; habitId: number }

const WEEK_CLASSES = [styles.w1, styles.w2, styles.w3, styles.w4, styles.w5]

/**
 * Месячный трекер привычек: привычки по строкам, дни по столбцам, недели — цветами кристаллов.
 * Сегодняшняя отметка приносит награду; прошлые дни — запись в дневнике без награды.
 */
export function HabitTracker({ state, catalog, onChanged }: Props) {
  const [month, setMonth] = useState<string | undefined>(undefined)
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [busyCell, setBusyCell] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'idle' })
  const toast = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const crystals = new Map(catalog.crystals.map((c) => [c.key, c]))

  const reload = useCallback(async (target?: string) => {
    try {
      const history = await fetchHabitHistory(target)
      setLoad({ status: 'ready', history })
    } catch (e) {
      setLoad({ status: 'error', message: e instanceof ApiError ? (e.detail ?? e.title) : 'Дневник не открылся.' })
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchHabitHistory(month)
      .then((history) => active && setLoad({ status: 'ready', history }))
      .catch((e: unknown) =>
        active && setLoad({ status: 'error', message: e instanceof ApiError ? (e.detail ?? e.title) : 'Дневник не открылся.' }),
      )
    return () => {
      active = false
    }
  }, [month])

  // Открываем сетку на сегодняшнем дне: в конце месяца он иначе прятался бы за прокруткой
  const loadedMonth = load.status === 'ready' ? load.history.month : null
  useEffect(() => {
    const today = scrollRef.current?.querySelector<HTMLElement>('[data-today]')
    today?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [loadedMonth])

  if (load.status === 'loading') return <p className={styles.note}>Листаем дневник…</p>
  if (load.status === 'error') {
    return (
      <div className={styles.note}>
        <p>{load.message}</p>
        <Button onClick={() => void reload(month)}>Ещё раз</Button>
      </div>
    )
  }

  const history = load.history
  const days = Array.from({ length: history.daysInMonth }, (_, i) => i + 1)
  const counts = countsPerDay(history)
  const maxCount = Math.max(1, history.habits.length)

  const toggle = async (habitId: number, title: string, day: number, done: boolean) => {
    const date = isoDay(history.month, day)
    const kind = dayState(history, day)
    if (kind === 'future' || kind === 'locked' || (kind === 'today' && done)) return
    const cell = `${habitId}:${day}`
    setBusyCell(cell)
    try {
      if (done) {
        await uncompleteHabitOn(habitId, date)
      } else {
        const result = await completeHabitOn(habitId, date)
        if (kind === 'today' && result.newlyCompleted) {
          toast(
            result.dailyLimitReached
              ? { message: `«${title}» — отмечено. Награды на сегодня закончились, но сад всё равно рад.` }
              : { message: `«${title}» — сделано.`, reward: describeReward(result.reward, catalog) },
          )
        }
      }
      await Promise.all([reload(history.month), onChanged()])
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось. Попробуйте ещё раз.' })
    } finally {
      setBusyCell(null)
    }
  }

  const save = async (action: Promise<unknown>) => {
    await action
    await Promise.all([reload(history.month), onChanged()])
    setMode({ kind: 'idle' })
  }

  const editing = mode.kind === 'edit' ? state.habits.find((h) => h.id === mode.habitId) : undefined

  return (
    <div className={styles.tracker}>
      <div className={styles.top}>
        <MiniCalendar history={history} counts={counts} onMonth={setMonth} />
        <div className={styles.summary}>
          <p className={styles.summaryLine}>
            Отметок за месяц: <strong>{counts.reduce((a, b) => a + b, 0)}</strong>
          </p>
          <p className={styles.summaryLine}>
            Награды сегодня: <strong>{state.dailyRewards.used}</strong> из {state.dailyRewards.limit}
          </p>
          <p className={styles.hint}>
            Сегодняшняя отметка приносит Семена жизни и осколок. Прошлые дни можно отметить для истории — без награды.
          </p>
        </div>
      </div>

      {history.habits.length === 0 ? (
        <p className={styles.note}>
          Пока ни одной привычки. Начните с чего-то совсем маленького — сад не торопится, и вы не торопитесь.
        </p>
      ) : (
        <div className={styles.scroll} ref={scrollRef}>
          <table className={styles.grid}>
            <thead>
              <tr>
                <th className={`${styles.sticky} ${styles.chartLabel}`} scope="row">
                  По дням
                </th>
                {days.map((day) => (
                  <td key={day} className={styles.chartCell} aria-hidden="true">
                    <span
                      className={`${styles.bar} ${WEEK_CLASSES[weekBand(day)]}`}
                      style={{ height: `${(counts[day - 1] / maxCount) * 100}%` }}
                    />
                  </td>
                ))}
                <td className={styles.total} />
              </tr>
              <tr>
                <th className={`${styles.sticky} ${styles.head}`} scope="col">
                  Привычки
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    data-today={dayState(history, day) === 'today' || undefined}
                    className={`${styles.dayHead} ${WEEK_CLASSES[weekBand(day)]} ${
                      dayState(history, day) === 'today' ? styles.todayHead : ''
                    }`}
                  >
                    {day}
                  </th>
                ))}
                <th scope="col" className={styles.total} title="Отметок за месяц">
                  Σ
                </th>
              </tr>
            </thead>
            <tbody>
              {history.habits.map((habit, index) => {
                const done = new Set(habit.days)
                const crystal = habit.crystalCategory ? crystals.get(habit.crystalCategory) : undefined
                return (
                  <tr key={habit.id}>
                    <th scope="row" className={styles.sticky}>
                      <div className={styles.habit}>
                        <span className={styles.index}>{index + 1}</span>
                        <span className={styles.title}>{habit.title}</span>
                        {crystal && (
                          <span title={crystal.name} className={styles.crystal}>
                            <CrystalIcon color={crystal.color} />
                          </span>
                        )}
                        {isCurrentMonth(history) && (
                          <button
                            type="button"
                            className={styles.edit}
                            aria-label={`Изменить «${habit.title}»`}
                            onClick={() => setMode({ kind: 'edit', habitId: habit.id })}
                          >
                            ✎
                          </button>
                        )}
                      </div>
                    </th>
                    {days.map((day) => {
                      const kind = dayState(history, day)
                      const isDone = done.has(day)
                      const closed = kind === 'future' || kind === 'locked' || (kind === 'today' && isDone)
                      return (
                        <td key={day} className={kind === 'today' ? styles.todayCol : undefined}>
                          <button
                            type="button"
                            className={`${styles.cell} ${WEEK_CLASSES[weekBand(day)]} ${isDone ? styles.done : ''} ${
                              kind === 'future' || kind === 'locked' ? styles.closed : ''
                            }`}
                            aria-pressed={isDone}
                            aria-label={`${habit.title}, ${day} число${kind === 'today' ? ', сегодня' : ''}`}
                            title={
                              kind === 'today' && isDone
                                ? 'Сегодня отмечено — награда уже в сумке'
                                : kind === 'future'
                                  ? 'Этот день ещё не наступил'
                                  : kind === 'locked'
                                    ? 'Так далеко дневник не листается'
                                    : undefined
                            }
                            disabled={closed || busyCell === `${habit.id}:${day}`}
                            onClick={() => void toggle(habit.id, habit.title, day, isDone)}
                          />
                        </td>
                      )
                    })}
                    <td className={styles.total}>{habit.days.length}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className={`${styles.sticky} ${styles.footLabel}`}>
                  Отмечено
                </th>
                {counts.map((count, i) => (
                  <td key={i} className={styles.count}>
                    {dayState(history, i + 1) === 'future' ? '' : count}
                  </td>
                ))}
                <td className={styles.total} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {mode.kind === 'create' && (
        <HabitForm
          crystals={catalog.crystals}
          submitLabel="Добавить"
          onSubmit={(input: HabitInput) => save(createHabit(input))}
          onCancel={() => setMode({ kind: 'idle' })}
        />
      )}
      {editing && (
        <HabitForm
          key={editing.id}
          crystals={catalog.crystals}
          initial={{ title: editing.title, crystalCategory: editing.crystalCategory }}
          submitLabel="Сохранить"
          onSubmit={(input) => save(updateHabit(editing.id, input))}
          onArchive={() => save(archiveHabit(editing.id))}
          onCancel={() => setMode({ kind: 'idle' })}
        />
      )}
      {mode.kind === 'idle' && isCurrentMonth(history) && (
        <div>
          <Button onClick={() => setMode({ kind: 'create' })}>+ Новая привычка</Button>
        </div>
      )}
    </div>
  )
}

type CalendarProps = { history: HabitHistory; counts: number[]; onMonth: (month: string) => void }

/** Мини-календарь с листанием месяцев; дни с отметками подсвечены. */
function MiniCalendar({ history, counts, onMonth }: CalendarProps) {
  const blanks = leadingBlanks(history.month)
  const current = isCurrentMonth(history)
  return (
    <div className={styles.calendar}>
      <div className={styles.calendarHead}>
        <button
          type="button"
          className={styles.arrow}
          aria-label="Предыдущий месяц"
          onClick={() => onMonth(shiftMonth(history.month, -1))}
        >
          ◂
        </button>
        <span className={styles.month}>{monthTitle(history.month)}</span>
        <button
          type="button"
          className={styles.arrow}
          aria-label="Следующий месяц"
          disabled={current}
          onClick={() => onMonth(shiftMonth(history.month, 1))}
        >
          ▸
        </button>
      </div>
      <div className={styles.calendarGrid}>
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.weekday}>
            {d}
          </span>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {counts.map((count, i) => {
          const kind = dayState(history, i + 1)
          return (
            <span
              key={i}
              className={`${styles.calDay} ${count > 0 ? styles.calMarked : ''} ${kind === 'today' ? styles.calToday : ''} ${
                kind === 'future' ? styles.calFuture : ''
              }`}
            >
              {i + 1}
            </span>
          )
        })}
      </div>
    </div>
  )
}
