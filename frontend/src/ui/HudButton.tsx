import type { ReactNode } from 'react'
import styles from './HudButton.module.css'

type Props = {
  icon: ReactNode
  label: string
  onClick: () => void
  /** Маленькая метка-счётчик в углу (например, сколько привычек отмечено сегодня) */
  badge?: string
  /** Кнопка — цель текущего задания: мягко светится, над ней покачивается «!» */
  highlight?: boolean
}

/** Кнопка панели действий: деревянная табличка с пиксельной иконкой и подписью. */
export function HudButton({ icon, label, onClick, badge, highlight }: Props) {
  return (
    <button type="button" className={highlight ? `${styles.button} ${styles.highlight}` : styles.button} onClick={onClick}>
      {highlight && (
        <svg className={styles.bang} width="14" height="30" viewBox="0 0 7 15" shapeRendering="crispEdges" aria-hidden="true">
          {/* тот же «!», что и в саду: контур, светлая левая грань, точка */}
          <rect x="1" y="0" width="5" height="11" fill="var(--c-ink)" />
          <rect x="1" y="10" width="5" height="5" fill="var(--c-ink)" />
          <rect x="2" y="1" width="3" height="7" fill="#f2a43a" />
          <rect x="2" y="1" width="1" height="7" fill="#fff0b0" />
          <rect x="3" y="8" width="1" height="2" fill="#d9781e" />
          <rect x="2" y="11" width="3" height="3" fill="#f2a43a" />
          <rect x="2" y="11" width="1" height="3" fill="#fff0b0" />
        </svg>
      )}
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{label}</span>
      {badge && <span className={styles.badge}>{badge}</span>}
    </button>
  )
}
