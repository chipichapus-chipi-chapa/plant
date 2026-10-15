import { useState } from 'react'
import { ApiError } from '../../api/client'
import { archiveHabit, completeHabitToday, createHabit, updateHabit } from '../../api/game'
import type { Catalog, GameState, Habit, HabitInput } from '../../api/types'
import { describeReward } from '../../lib/rewards'
import { Button } from '../../ui/Button'
import { CrystalIcon } from '../../ui/icons/CrystalIcon'
import { Panel } from '../../ui/Panel'
import { useToast } from '../notifications/Toasts'
import { HabitForm } from './HabitForm'
import styles from './HabitsPanel.module.css'

type Props = {
  state: GameState
  catalog: Catalog
  /** Перечитать состояние с сервера после действия */
  onChanged: () => Promise<void>
}

type Mode = { kind: 'idle' } | { kind: 'create' } | { kind: 'edit'; habitId: number }

export function HabitsPanel({ state, catalog, onChanged }: Props) {
  const [mode, setMode] = useState<Mode>({ kind: 'idle' })
  const [completing, setCompleting] = useState<Set<number>>(new Set())
  const toast = useToast()
  const crystals = new Map(catalog.crystals.map((c) => [c.key, c]))

  const save = async (action: Promise<unknown>) => {
    await action
    await onChanged()
    setMode({ kind: 'idle' })
  }

  const complete = async (habit: Habit) => {
    setCompleting((s) => new Set(s).add(habit.id))
    try {
      const result = await completeHabitToday(habit.id)
      if (result.newlyCompleted) {
        toast(
          result.dailyLimitReached
            ? { message: `«${habit.title}» — отмечено. Награды на сегодня закончились, но сад всё равно рад.` }
            : { message: `«${habit.title}» — сделано.`, reward: describeReward(result.reward, catalog) },
        )
      }
      await onChanged()
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось отметить. Попробуйте ещё раз.' })
    } finally {
      setCompleting((s) => {
        const next = new Set(s)
        next.delete(habit.id)
        return next
      })
    }
  }

  const { used, limit } = state.dailyRewards

  return (
    <Panel title="Привычки">
      {state.habits.length === 0 && mode.kind !== 'create' && (
        <p className={styles.empty}>
          Пока ни одной. Начните с чего-то совсем маленького — сад не торопится, и вы не торопитесь.
        </p>
      )}

      {state.habits.length > 0 && (
        <ul className={styles.list}>
          {state.habits.map((habit) =>
            mode.kind === 'edit' && mode.habitId === habit.id ? (
              <li key={habit.id}>
                <HabitForm
                  crystals={catalog.crystals}
                  initial={{ title: habit.title, crystalCategory: habit.crystalCategory }}
                  submitLabel="Сохранить"
                  onSubmit={(input: HabitInput) => save(updateHabit(habit.id, input))}
                  onArchive={() => save(archiveHabit(habit.id))}
                  onCancel={() => setMode({ kind: 'idle' })}
                />
              </li>
            ) : (
              <li key={habit.id} className={styles.row}>
                <button
                  type="button"
                  className={styles.check}
                  aria-pressed={habit.doneToday}
                  aria-label={habit.doneToday ? `«${habit.title}» — сделано сегодня` : `Отметить «${habit.title}»`}
                  disabled={habit.doneToday || completing.has(habit.id)}
                  onClick={() => void complete(habit)}
                >
                  {habit.doneToday && <span className={styles.tick} aria-hidden="true" />}
                </button>
                <span className={habit.doneToday ? styles.titleDone : styles.title}>{habit.title}</span>
                {habit.crystalCategory && crystals.has(habit.crystalCategory) && (
                  <span title={crystals.get(habit.crystalCategory)!.name} className={styles.crystal}>
                    <CrystalIcon color={crystals.get(habit.crystalCategory)!.color} />
                  </span>
                )}
                <button
                  type="button"
                  className={styles.edit}
                  aria-label={`Изменить «${habit.title}»`}
                  disabled={mode.kind !== 'idle'}
                  onClick={() => setMode({ kind: 'edit', habitId: habit.id })}
                >
                  ✎
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {mode.kind === 'create' ? (
        <HabitForm
          crystals={catalog.crystals}
          submitLabel="Добавить"
          onSubmit={(input) => save(createHabit(input))}
          onCancel={() => setMode({ kind: 'idle' })}
        />
      ) : (
        <div className={styles.footer}>
          <Button onClick={() => setMode({ kind: 'create' })} disabled={mode.kind !== 'idle'}>
            + Новая привычка
          </Button>
          {used > 0 && (
            <span className={styles.limit} title="Сколько отметок сегодня уже принесли награду">
              Награды сегодня: {used} из {limit}
            </span>
          )}
        </div>
      )}
    </Panel>
  )
}
