import { useEffect, useRef, type ReactNode } from 'react'
import styles from './Window.module.css'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  /** wide — для таблиц вроде трекера привычек */
  size?: 'normal' | 'wide'
}

/**
 * Игровое окно поверх сада: пергамент в деревянной рамке.
 * Закрывается крестиком, Escape или кликом по затемнению; фокус переходит в окно и возвращается обратно.
 */
export function Window({ title, onClose, children, size = 'normal' }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus()
    }
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={`${styles.window} ${size === 'wide' ? styles.wide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.titlebar}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            <svg width="16" height="16" viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <g key={i} fill="currentColor">
                  <rect x={i} y={i} width="1" height="1" />
                  <rect x={7 - i} y={i} width="1" height="1" />
                </g>
              ))}
            </svg>
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
