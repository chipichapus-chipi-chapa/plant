import styles from './Fireflies.module.css'

// Положения и ритм светлячков заданы заранее: одинаковые при каждой загрузке, без случайных скачков
const FLIES = [
  { x: 12, y: 30, delay: 0, duration: 9 },
  { x: 28, y: 62, delay: 2.5, duration: 11 },
  { x: 47, y: 22, delay: 1.2, duration: 10 },
  { x: 63, y: 70, delay: 4, duration: 12 },
  { x: 78, y: 40, delay: 0.6, duration: 9.5 },
  { x: 88, y: 18, delay: 3.1, duration: 13 },
  { x: 36, y: 84, delay: 5.2, duration: 10.5 },
  { x: 70, y: 55, delay: 6.4, duration: 11.5 },
]

/** Светлячки над садом: только украшение, клики проходят насквозь. */
export function Fireflies() {
  return (
    <div className={styles.layer} aria-hidden="true">
      {FLIES.map((fly, i) => (
        <span
          key={i}
          className={styles.fly}
          style={{
            left: `${fly.x}%`,
            top: `${fly.y}%`,
            animationDelay: `${fly.delay}s, ${fly.delay}s`,
            animationDuration: `${fly.duration}s, ${fly.duration / 3}s`,
          }}
        />
      ))}
    </div>
  )
}
