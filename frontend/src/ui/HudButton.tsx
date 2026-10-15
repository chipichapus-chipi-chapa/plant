import type { ReactNode } from 'react'
import styles from './HudButton.module.css'

type Props = {
  icon: ReactNode
  label: string
  onClick: () => void
  /** Маленькая метка-счётчик в углу (например, сколько привычек отмечено сегодня) */
  badge?: string
}

/** Кнопка панели действий: деревянная табличка с пиксельной иконкой и подписью. */
export function HudButton({ icon, label, onClick, badge }: Props) {
  return (
    <button type="button" className={styles.button} onClick={onClick}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
      {badge && <span className={styles.badge}>{badge}</span>}
    </button>
  )
}
