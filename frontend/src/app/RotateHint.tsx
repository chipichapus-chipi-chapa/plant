import styles from './RotateHint.module.css'

/**
 * На телефоне в вертикальном положении — просьба повернуть его: сад широкий, как экран кино.
 * Показывается и прячется одним CSS (ориентация + сенсорный экран), без кода.
 */
export function RotateHint() {
  return (
    <div className={styles.hint} role="alert">
      <div className={styles.phone} aria-hidden="true" />
      <p>Поверните телефон — сад широкий, ему нужен простор</p>
    </div>
  )
}
