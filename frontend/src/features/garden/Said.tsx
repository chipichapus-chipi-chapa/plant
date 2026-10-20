import { useEffect, useRef } from 'react'
import { textDelay, useSettings } from '../../app/settings'
import { useTypewriter } from '../mentor/useTypewriter'
import styles from './Said.module.css'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Реплика о предмете — как у жителей: имя табличкой, текст по буквам (скорость — из настроек).
 * Нажатие на текст показывает его целиком.
 */
export function Said({ name, text }: { name: string; text: string }) {
  const { settings } = useSettings()
  const { shownRef, ghostRef, complete, finish } = useTypewriter(text, textDelay(settings.textSpeed), reducedMotion())
  return (
    <div className={styles.said} onClick={complete ? undefined : finish}>
      <span className={styles.name}>{name}</span>
      {text && (
        <p className={styles.text}>
          <span ref={shownRef} />
          <span ref={ghostRef} className={styles.ghost} aria-hidden="true" />
        </p>
      )}
    </div>
  )
}

/** Портрет героя для реплик о предметах: лицо из его же спрайта (32×32 сверху кадра). */
export function HeroPortrait({ image }: { image: CanvasImageSource | null }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx || !image) return
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, 32, 32)
    ctx.drawImage(image, 0, 4, 32, 32, 0, 0, 32, 32)
  }, [image])
  return (
    <div className={styles.portrait}>
      <canvas ref={ref} width={32} height={32} className={styles.face} aria-hidden="true" />
    </div>
  )
}
