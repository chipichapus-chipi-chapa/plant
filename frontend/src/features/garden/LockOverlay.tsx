import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { attemptPuzzle } from '../../api/game'
import type { Catalog, ItemGrant, Puzzle } from '../../api/types'
import { frameImage, type Atlas } from '../../game/atlas'
import { describeReward } from '../../lib/rewards'
import { Button } from '../../ui/Button'
import { useToast } from '../notifications/Toasts'
import styles from './LockOverlay.module.css'

type Props = {
  puzzle: Puzzle
  catalog: Catalog
  atlas: Atlas
  onClose: () => void
  onChanged: () => Promise<void>
}

/** Сколько длится анимация открытия: дужка выскакивает, замок падает. */
const OPEN_MS = 1200
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

type Phase = 'idle' | 'busy' | 'wrong' | 'opening'

/**
 * Замок крупно, поверх сада. Колёсики крутятся мышью (▲▼) или клавишами: ←→ — выбрать колёсико,
 * ↑↓ — повернуть, Enter или E — открыть, Escape — отойти. Комбинацию проверяет сервер;
 * ошибка ничего не стоит — замок только вздрагивает. Открылся — дужка выскакивает, замок падает.
 */
export function LockOverlay({ puzzle, catalog, atlas, onClose, onChanged }: Props) {
  const [dials, setDials] = useState<number[]>(() => Array.from({ length: puzzle.dials }, () => 0))
  const [active, setActive] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [note, setNote] = useState<string | null>(null)
  const toast = useToast()
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => boxRef.current?.focus(), [])

  const turn = (dial: number, delta: number) => {
    if (phase === 'opening') return
    setNote(null)
    setActive(dial)
    setDials((current) => current.map((v, i) => (i === dial ? (v + delta + puzzle.symbols.length) % puzzle.symbols.length : v)))
  }

  const tryOpen = async () => {
    if (phase === 'busy' || phase === 'opening') return
    setPhase('busy')
    try {
      const result = await attemptPuzzle(puzzle.key, dials.map((i) => puzzle.symbols[i].key))
      if (!result.solved) {
        setNote(result.text)
        setPhase('wrong')
        return
      }
      setPhase('opening')
      window.setTimeout(() => void finish(result.text, result.reward), reducedMotion() ? 0 : OPEN_MS)
    } catch (e) {
      setNote(e instanceof ApiError ? (e.detail ?? e.title) : 'Замок заело. Попробуйте ещё раз.')
      setPhase('idle')
    }
  }

  const finish = async (text: string, reward: ItemGrant[]) => {
    const lines = describeReward(reward, catalog).map((r) => `${r.label} ×${r.quantity}`)
    toast({ message: lines.length ? `${text} Получено: ${lines.join(', ')}.` : text })
    onClose()
    await onChanged()
  }

  // Клавиатура: колёсики стрелками, открыть — Enter/E, отойти — Escape.
  // Обработчик пересоздаётся на каждом рендере — он маленький, а так всегда видит свежее состояние.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const keys: Record<string, () => void> = {
        ArrowLeft: () => setActive((a) => (a + puzzle.dials - 1) % puzzle.dials),
        ArrowRight: () => setActive((a) => (a + 1) % puzzle.dials),
        ArrowUp: () => turn(active, -1),
        ArrowDown: () => turn(active, 1),
        Enter: () => void tryOpen(),
        KeyE: () => void tryOpen(),
        Escape: () => phase !== 'opening' && onClose(),
      }
      const action = keys[e.code] ?? keys[e.key]
      if (!action || (e.target instanceof HTMLButtonElement && (e.code === 'Enter' || e.code === 'Space'))) return
      e.preventDefault()
      e.stopPropagation()
      action()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  const lockClass = [styles.lock, phase === 'wrong' && styles.shake, phase === 'opening' && styles.opening].filter(Boolean).join(' ')

  return (
    <div className={styles.backdrop} onClick={() => phase !== 'opening' && onClose()}>
      <div
        ref={boxRef}
        className={styles.box}
        role="dialog"
        aria-modal="true"
        aria-label="Замок на ящике"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={lockClass} onAnimationEnd={() => phase === 'wrong' && setPhase('idle')}>
          <div className={styles.shackle} aria-hidden="true" />
          <div className={styles.plate}>
            {dials.map((value, i) => {
              const symbol = puzzle.symbols[value]
              return (
                <div key={i} className={i === active ? `${styles.dial} ${styles.active}` : styles.dial}>
                  <button type="button" className={styles.turn} onClick={() => turn(i, -1)} aria-label={`Колёсико ${i + 1}: назад`}>
                    ▲
                  </button>
                  <div className={styles.window}>
                    <SymbolIcon atlas={atlas} symbolKey={symbol.key} />
                  </div>
                  <span className={styles.name}>{symbol.name}</span>
                  <button type="button" className={styles.turn} onClick={() => turn(i, 1)} aria-label={`Колёсико ${i + 1}: вперёд`}>
                    ▼
                  </button>
                </div>
              )
            })}
          </div>
        </div>
        <p className={styles.note} aria-live="polite">
          {phase === 'opening' ? 'Щёлк!' : (note ?? puzzle.prompt)}
        </p>
        <div className={styles.actions}>
          <Button onClick={() => void tryOpen()} disabled={phase === 'busy' || phase === 'opening'}>
            Открыть
          </Button>
          <Button onClick={onClose} disabled={phase === 'opening'}>
            Отойти
          </Button>
        </div>
        <p className={styles.keys}>←→ колёсико · ↑↓ повернуть · Enter — открыть</p>
      </div>
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
