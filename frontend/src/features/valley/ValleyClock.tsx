import { useEffect, useState } from 'react'
import { windValleyClock } from '../../api/game'
import { ApiError } from '../../api/client'
import type { GameState } from '../../api/types'
import { SEASON_NAMES } from '../../game/season'
import { Button } from '../../ui/Button'
import { useToast } from '../notifications/Toasts'
import styles from './ValleyClock.module.css'

type Props = {
  state: GameState
  onChanged: () => Promise<void>
}

const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

/**
 * Часы долины: время года в долине условно меняется каждые полчаса, а стрелками его можно перевести
 * вперёд или назад. Дни недели, привычки и награды за них живут по настоящему календарю.
 */
export function ValleyClock({ state, onChanged }: Props) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const season = state.season
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const minutes = season ? Math.max(1, Math.round((Date.parse(season.endsAt) - now) / 60000)) : null

  const day = state.valleyToday ?? state.today
  const wound = !!season?.wound || day !== state.today

  const wind = async (turn: { seasons?: number; days?: number; reset?: boolean }) => {
    setBusy(true)
    try {
      await windValleyClock(turn)
      await onChanged()
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Стрелки заело. Попробуйте ещё раз.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.clock}>
      <p className={styles.now}>
        {weekday(day)}
        {season && <> · {SEASON_NAMES[season.season].toLowerCase()}</>}
      </p>
      <p className={styles.hint}>
        В долине время года меняется каждые полчаса{minutes ? ` — следующее примерно через ${minutes} мин` : ''}. Стрелками
        можно перевести время года или день — например, к пятничной ярмарке. Привычки живут по настоящему календарю —
        их часы не трогают.
      </p>
      <div className={styles.row}>
        <span className={styles.label}>Время года</span>
        <Button disabled={busy} onClick={() => void wind({ seasons: -1 })}>◀ прошлое</Button>
        <Button disabled={busy} onClick={() => void wind({ seasons: 1 })}>следующее ▶</Button>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>День</span>
        <Button disabled={busy} onClick={() => void wind({ days: -1 })}>◀ вчера</Button>
        <Button disabled={busy} onClick={() => void wind({ days: 1 })}>завтра ▶</Button>
      </div>
      {wound && (
        <Button disabled={busy} onClick={() => void wind({ reset: true })}>
          Вернуть стрелки как было
        </Button>
      )}
    </div>
  )
}
