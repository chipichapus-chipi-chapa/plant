import { useState } from 'react'
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

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

function describe(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d))
  return `${WEEKDAYS[day.getUTCDay()]}, ${d} ${MONTHS[m - 1]}`
}

/**
 * Часы долины: время года в долине идёт быстрее настоящего (каждое — неделю), а стрелки можно покрутить —
 * вперёд, к зиме или ярмарке, или назад. Привычки и награды за них живут по настоящему календарю.
 */
export function ValleyClock({ state, onChanged }: Props) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const valley = state.valleyToday ?? state.today
  const wound = valley !== state.today

  const wind = async (days: number) => {
    setBusy(true)
    try {
      await windValleyClock(days)
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
        В долине — {describe(valley)}
        {state.season && <> · {SEASON_NAMES[state.season.season].toLowerCase()}</>}
      </p>
      <p className={styles.hint}>
        Время года здесь меняется каждую неделю. Покрутите стрелки, чтобы заглянуть в зиму или дождаться пятничной ярмарки.
        Привычки живут по настоящему календарю — их часы не трогают.
      </p>
      <div className={styles.row}>
        <Button disabled={busy} onClick={() => void wind(-7)}>◀◀ неделя</Button>
        <Button disabled={busy} onClick={() => void wind(-1)}>◀ день</Button>
        <Button disabled={busy} onClick={() => void wind(1)}>день ▶</Button>
        <Button disabled={busy} onClick={() => void wind(7)}>неделя ▶▶</Button>
      </div>
      {wound && (
        <Button disabled={busy} onClick={() => void wind(0)}>
          Вернуть настоящее время ({describe(state.today)})
        </Button>
      )}
    </div>
  )
}
