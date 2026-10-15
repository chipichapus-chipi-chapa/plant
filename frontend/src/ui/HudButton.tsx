import type { ReactNode } from 'react'
import styles from './HudButton.module.css'

type Props = {
  icon: ReactNode
  label: string
  onClick: () => void
  /** Маленькая метка-счётчик в углу (например, сколько привычек отмечено сегодня) */
  badge?: string
  /** Кнопка — цель текущего задания: мягко светится, над ней стрелка */
  highlight?: boolean
}

/** Кнопка панели действий: деревянная табличка с пиксельной иконкой и подписью. */
export function HudButton({ icon, label, onClick, badge, highlight }: Props) {
  return (
    <button type="button" className={highlight ? `${styles.button} ${styles.highlight}` : styles.button} onClick={onClick}>
      {highlight && <span className={styles.arrow} aria-hidden="true" />}
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
      {badge && <span className={styles.badge}>{badge}</span>}
    </button>
  )
}
