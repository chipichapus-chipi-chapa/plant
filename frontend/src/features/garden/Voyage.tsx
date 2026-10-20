import { useEffect, useRef } from 'react'
import { frameImage, type Atlas } from '../../game/atlas'
import styles from './Voyage.module.css'

/** Сколько длится плавание через озеро. */
export const VOYAGE_MS = 5200

const W = 320
const H = 180

type Props = {
  atlas: Atlas
  /** Герой сбоку (кадр стоя): он сидит в лодке */
  hero: CanvasImageSource | null
  /** 1 — плывём вправо (в городок), -1 — влево (обратно к озеру) */
  direction: 1 | -1
}

/**
 * Плавание через Туманное озеро — короткая сценка между локациями: лодка с героем скользит по тёмной воде,
 * за кормой расходится след, фонарик на носу светит, а клочья тумана расступаются.
 * Рисуется в маленьком холсте и увеличивается без сглаживания — как сам сад.
 */
export function Voyage({ atlas, hero, direction }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    const water = frameImage(atlas, 'water_15')
    const boat = frameImage(atlas, 'prop_boat')
    const start = performance.now()
    let frame = 0

    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / VOYAGE_MS)
      // вода: тайлы озера и бегущие блики
      ctx.fillStyle = '#0d1a1e'
      ctx.fillRect(0, 0, W, H)
      if (water) for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) ctx.drawImage(water, x, y)
      ctx.fillStyle = 'rgba(143, 208, 196, 0.35)'
      for (let i = 0; i < 26; i++) {
        const x = (i * 53 + now / 40) % (W + 20) - 10
        const y = (i * 37) % H
        if ((Math.floor(now / 300) + i) % 3) ctx.fillRect(Math.round(x), y, 3 + (i % 3), 1)
      }

      // лодка: плавно разгоняется и тормозит, чуть покачивается
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
      const span = W + 90
      const bx = Math.round(direction === 1 ? -80 + ease * span : W + 16 - ease * span)
      const by = 92 + Math.round(Math.sin(now / 420) * 1.5)

      // след за кормой: две расходящиеся дорожки
      ctx.fillStyle = 'rgba(205, 230, 224, 0.5)'
      for (let k = 1; k < 9; k++) {
        const wx = bx + (direction === 1 ? -k * 7 : 64 + k * 7)
        ctx.fillRect(wx, by + 14 - k, 3, 1)
        ctx.fillRect(wx, by + 18 + k, 3, 1)
      }

      // герой сидит в лодке: рисуем его, а борт лодки поверх закрывает ноги
      if (hero) {
        ctx.save()
        if (direction === -1) {
          ctx.translate(bx + 32 + 16, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(hero, -16, by - 24)
        } else {
          ctx.drawImage(hero, bx + 16, by - 24)
        }
        ctx.restore()
      }
      if (boat) {
        ctx.save()
        if (direction === -1) {
          ctx.translate(bx + 64, 0)
          ctx.scale(-1, 1)
          ctx.drawImage(boat, 0, by)
        } else {
          ctx.drawImage(boat, bx, by)
        }
        ctx.restore()
      }

      // сумерки и тёплый фонарик на носу
      ctx.fillStyle = 'rgba(10, 8, 10, 0.45)'
      ctx.fillRect(0, 0, W, H)
      const lx = direction === 1 ? bx + 58 : bx + 6
      const glow = ctx.createRadialGradient(lx, by + 6, 0, lx, by + 6, 46)
      glow.addColorStop(0, 'rgba(255, 207, 122, 0.45)')
      glow.addColorStop(1, 'rgba(255, 207, 122, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(lx - 46, by - 40, 92, 92)
      ctx.fillStyle = '#ffd06a'
      ctx.fillRect(lx - 1, by + 4, 2, 3)

      // туман расступается: клубы редеют к концу пути
      for (let i = 0; i < 9; i++) {
        const fx = ((i * 71 - now / 25 * direction) % (W + 120) + W + 120) % (W + 120) - 60
        const fy = 20 + ((i * 47) % (H - 40))
        const r = 40 + (i % 3) * 14
        const a = 0.22 * (1 - t * 0.8)
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r)
        g.addColorStop(0, `rgba(196, 204, 208, ${a.toFixed(3)})`)
        g.addColorStop(1, 'rgba(196, 204, 208, 0)')
        ctx.fillStyle = g
        ctx.fillRect(fx - r, fy - r, r * 2, r * 2)
      }

      if (t < 1) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [atlas, hero, direction])

  return (
    <div className={styles.voyage} style={{ animationDuration: `${VOYAGE_MS}ms` }} aria-hidden="true">
      <canvas ref={ref} width={W} height={H} className={styles.scene} />
      <p className={styles.caption}>{direction === 1 ? 'Лодка скользит по тихой воде…' : 'Обратно, к лилиям и Мяте…'}</p>
    </div>
  )
}
