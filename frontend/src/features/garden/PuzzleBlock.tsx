import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { attemptPuzzle } from '../../api/game'
import type { Catalog, GameState, Puzzle } from '../../api/types'
import { frameImage, type Atlas } from '../../game/atlas'
import { describeReward } from '../../lib/rewards'
import { Button } from '../../ui/Button'
import { useToast } from '../notifications/Toasts'
import styles from './PuzzleBlock.module.css'

type Props = {
  puzzle: Puzzle
  state: GameState
  catalog: Catalog
  atlas: Atlas
  onChanged: () => Promise<void>
}

/**
 * Замок с колёсиками: каждое крутится по кругу через все символы. Комбинацию проверяет сервер,
 * ошибаться можно сколько угодно — неверная попытка ничего не стоит.
 */
export function PuzzleBlock({ puzzle, state, catalog, atlas, onChanged }: Props) {
  const [dials, setDials] = useState<number[]>(() => Array.from({ length: puzzle.dials }, () => 0))
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const toast = useToast()

  if (state.solvedPuzzles.includes(puzzle.key)) {
    return <p className={styles.note}>Замок открыт, ящик пуст — всё нужное уже у вас.</p>
  }

  const turn = (dial: number, delta: number) => {
    setNote(null)
    setDials((current) => current.map((v, i) => (i === dial ? (v + delta + puzzle.symbols.length) % puzzle.symbols.length : v)))
  }

  const tryOpen = async () => {
    setBusy(true)
    try {
      const result = await attemptPuzzle(puzzle.key, dials.map((i) => puzzle.symbols[i].key))
      if (!result.solved) {
        setNote(result.text)
        return
      }
      const reward = describeReward(result.reward, catalog).map((r) => `${r.label} ×${r.quantity}`)
      toast({ message: reward.length ? `${result.text} Получено: ${reward.join(', ')}.` : result.text })
      await onChanged()
    } catch (e) {
      setNote(e instanceof ApiError ? (e.detail ?? e.title) : 'Замок заело. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.puzzle}>
      <p className={styles.prompt}>{puzzle.prompt}</p>
      <div className={styles.dials}>
        {dials.map((value, i) => {
          const symbol = puzzle.symbols[value]
          return (
            <div key={i} className={styles.dial}>
              <button type="button" className={styles.turn} onClick={() => turn(i, -1)} aria-label={`Колёсико ${i + 1}: назад`}>
                ▲
              </button>
              <SymbolIcon atlas={atlas} symbolKey={symbol.key} />
              <span className={styles.name}>{symbol.name}</span>
              <button type="button" className={styles.turn} onClick={() => turn(i, 1)} aria-label={`Колёсико ${i + 1}: вперёд`}>
                ▼
              </button>
            </div>
          )
        })}
      </div>
      <div>
        <Button onClick={() => void tryOpen()} disabled={busy}>
          Открыть
        </Button>
      </div>
      {note && <p className={styles.note}>{note}</p>}
    </div>
  )
}

/** Символ на колёсике — кадр атласа sym_<key>, крупно и без размытия. */
function SymbolIcon({ atlas, symbolKey }: { atlas: Atlas; symbolKey: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    const image = frameImage(atlas, `sym_${symbolKey}`)
    if (!ctx || !image) return
    ctx.clearRect(0, 0, 12, 12)
    ctx.drawImage(image, 0, 0)
  }, [atlas, symbolKey])
  return <canvas ref={ref} width={12} height={12} className={styles.symbol} aria-hidden="true" />
}
