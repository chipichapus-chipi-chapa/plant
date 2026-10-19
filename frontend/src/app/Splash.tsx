import { useEffect, useRef, useState } from 'react'
import { frameImage, loadAtlas } from '../game/atlas'
import { Fireflies } from '../game/Fireflies'
import styles from './Splash.module.css'

/** Через сколько показать подсказку, что сервер просыпается */
const SLOW_MS = 4000

type Props = {
  /** Готова ли игра (состояние загружено): до этого кнопка ждёт */
  ready: boolean
  onStart: () => void
}

/**
 * Заставка при запуске: название, кошка Мята между двумя исполинскими лилиями, светлячки.
 * Нажатие (или Enter / пробел) начинает игру — на телефоне заодно включаем полный экран.
 */
export function Splash({ ready, onStart }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let active = true
    void loadAtlas()
      .then((atlas) => {
        const ctx = ref.current?.getContext('2d')
        if (!active || !ctx) return
        ctx.imageSmoothingEnabled = false
        const lily = frameImage(atlas, 'prop_giant_lily_awakened')
        const cat = frameImage(atlas, 'npc_myata_0')
        if (lily) {
          ctx.drawImage(lily, -6, 0)
          ctx.save()
          ctx.translate(166, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(lily, 0, 0)
          ctx.restore()
        }
        if (cat) ctx.drawImage(cat, 64, 48)
      })
      .catch(() => {
        // без картинки заставка всё равно работает — остаётся название
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onStart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ready, onStart])

  // Сервер после простоя просыпается долго — через несколько секунд объясняем, что ждём
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (ready) return
    const timer = window.setTimeout(() => setSlow(true), SLOW_MS)
    return () => window.clearTimeout(timer)
  }, [ready])

  return (
    <div className={styles.splash} onClick={() => ready && onStart()} role="dialog" aria-label="Там, где растёт">
      <Fireflies />
      <h1 className={styles.title}>Там, где растёт</h1>
      <canvas ref={ref} width={160} height={96} className={styles.scene} aria-hidden="true" />
      <p className={styles.motto}>Маленькие шаги тоже ведут к большим мечтам</p>
      <button type="button" className={styles.start} disabled={!ready} onClick={onStart}>
        {ready ? 'Нажмите, чтобы начать' : 'Отворяем калитку…'}
      </button>
      {!ready && slow && <p className={styles.wait}>Сад просыпается после тишины — это бывает до минуты.</p>}
    </div>
  )
}
