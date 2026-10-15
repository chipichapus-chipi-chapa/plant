import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import type { CrystalCategory, HabitInput } from '../../api/types'
import { Button } from '../../ui/Button'
import { CrystalPicker } from './CrystalPicker'
import styles from './HabitForm.module.css'

type Props = {
  crystals: CrystalCategory[]
  initial?: HabitInput
  submitLabel: string
  onSubmit: (input: HabitInput) => Promise<void>
  onCancel: () => void
  /** Для режима редактирования: убрать привычку в архив */
  onArchive?: () => Promise<void>
}

const MAX_TITLE = 60

export function HabitForm({ crystals, initial, submitLabel, onSubmit, onCancel, onArchive }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [crystal, setCrystal] = useState<string | null>(initial?.crystalCategory ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const id = useId()

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось. Попробуйте ещё раз.')
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    // Простую проверку делаем и здесь, чтобы не гонять запрос впустую; окончательно проверяет сервер
    if (title.trim() === '') {
      setError('Назовите привычку.')
      return
    }
    void run(() => onSubmit({ title, crystalCategory: crystal }))
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label className={styles.label} htmlFor={`${id}-title`}>
        Что будете делать?
      </label>
      <input
        id={`${id}-title`}
        className={styles.input}
        value={title}
        maxLength={MAX_TITLE}
        placeholder="Например, читать перед сном"
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
        aria-invalid={error !== null}
        aria-describedby={error ? `${id}-error` : undefined}
      />

      <CrystalPicker crystals={crystals} value={crystal} onChange={setCrystal} name={`${id}-crystal`} />

      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        <Button onClick={onCancel} disabled={busy} className={styles.secondary}>
          Отмена
        </Button>
        {onArchive &&
          (confirmArchive ? (
            <Button onClick={() => void run(onArchive)} disabled={busy} className={styles.danger}>
              Точно убрать? Награды останутся
            </Button>
          ) : (
            <Button onClick={() => setConfirmArchive(true)} disabled={busy} className={styles.secondary}>
              Убрать в архив
            </Button>
          ))}
      </div>
    </form>
  )
}
