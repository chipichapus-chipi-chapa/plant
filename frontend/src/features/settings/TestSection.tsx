import { useState } from 'react'
import { ApiError } from '../../api/client'
import { runTestAction, type TestAction } from '../../api/game'
import type { GameState } from '../../api/types'
import styles from './SettingsPanel.module.css'

const ACTIONS: { action: TestAction; label: string; done: string }[] = [
  { action: 'resources', label: 'Ресурсы', done: '+100 Семян жизни, 10 искр, по 5 осколков и семян.' },
  { action: 'open-paths', label: 'Открыть все тропы', done: 'Калитка открыта, Хмур пропустил, сад поместья ожил — туман начал редеть.' },
  { action: 'fog-day', label: 'Туман +1 день', done: 'Как будто прошёл ещё один день с привычками.' },
  { action: 'fog-clear', label: 'Рассеять туман', done: 'Туман над озером рассеялся.' },
]

/**
 * Кнопки тестирования: проверить сюжет, не проходя его неделями. Видны только тестировщикам
 * (локально — всегда; на сервере — Telegram id из GAME_TESTERS) и меняют только свой сад.
 */
export function TestSection({ state, onChanged }: { state: GameState; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  if (!state.tester) return null

  const run = async (action: TestAction, done: string) => {
    setBusy(true)
    try {
      await runTestAction(action)
      await onChanged()
      setNote(done)
    } catch (e) {
      setNote(e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось.')
    } finally {
      setBusy(false)
      setConfirmReset(false)
    }
  }

  const fog = state.fog?.started ? ` · туман ${state.fog.days}/${state.fog.needed}` : ''
  return (
    <div className={styles.row}>
      <span className={styles.label}>Тестирование{fog}</span>
      <div className={styles.options}>
        {ACTIONS.map(({ action, label, done }) => (
          <button key={action} type="button" className={styles.off} disabled={busy} onClick={() => void run(action, done)}>
            {label}
          </button>
        ))}
        <button
          type="button"
          className={confirmReset ? styles.on : styles.off}
          disabled={busy}
          onClick={() => (confirmReset ? void run('reset', 'Новая игра: прогресс стёрт, имя и облик остались.') : setConfirmReset(true))}
        >
          {confirmReset ? 'Точно стереть?' : 'Сбросить прогресс'}
        </button>
      </div>
      {note && <p className={styles.note}>{note}</p>}
    </div>
  )
}
