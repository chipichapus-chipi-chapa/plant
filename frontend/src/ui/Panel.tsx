import type { ReactNode } from 'react'
import styles from './Panel.module.css'

type PanelProps = {
  title?: string
  className?: string
  children: ReactNode
}

export function Panel({ title, className, children }: PanelProps) {
  return (
    <section className={[styles.panel, className].filter(Boolean).join(' ')}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </section>
  )
}
