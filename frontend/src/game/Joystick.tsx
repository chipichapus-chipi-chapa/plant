import { useRef, useState, type PointerEvent } from 'react'
import styles from './Joystick.module.css'

type Props = {
  /** Направление: вектор длиной до 1; (0, 0) — отпустили */
  onMove: (dx: number, dy: number) => void
  onAction: () => void
}

const RADIUS = 44

/** Экранный джойстик и кнопка действия для телефона. */
export function Joystick({ onMove, onAction }: Props) {
  const baseRef = useRef<HTMLDivElement>(null)
  // какой палец сейчас держит джойстик (второй палец не перехватывает управление)
  const activePointer = useRef<number | null>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })

  const update = (e: PointerEvent<HTMLDivElement>) => {
    const rect = baseRef.current!.getBoundingClientRect()
    let dx = e.clientX - (rect.left + rect.width / 2)
    let dy = e.clientY - (rect.top + rect.height / 2)
    const length = Math.hypot(dx, dy)
    if (length > RADIUS) {
      dx = (dx / length) * RADIUS
      dy = (dy / length) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    onMove(dx / RADIUS, dy / RADIUS)
  }

  const release = (e: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return
    activePointer.current = null
    setKnob({ x: 0, y: 0 })
    onMove(0, 0)
  }

  return (
    <div className={styles.controls}>
      <div
        ref={baseRef}
        className={styles.base}
        aria-hidden="true"
        onPointerDown={(e) => {
          if (activePointer.current !== null) return
          activePointer.current = e.pointerId
          try {
            // палец может уйти за край джойстика — события всё равно придут сюда
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            // без захвата тоже работает, просто до первого выхода за край
          }
          update(e)
        }}
        onPointerMove={(e) => {
          if (activePointer.current === e.pointerId) update(e)
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        <span className={styles.knob} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <button type="button" className={styles.action} onClick={onAction} aria-label="Действие">
        ✋
      </button>
    </div>
  )
}
