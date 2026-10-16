import type { Objective } from '../../game/guidance'
import styles from './QuestTracker.module.css'

type Props = {
  objective: Objective
  speaker: string
  /** Цель — кнопка панели: клик по заданию сразу открывает нужное окно */
  onOpenHud: (key: string) => void
}

/** Строка текущего задания над садом. Спокойная: без таймеров и счётчиков. */
export function QuestTracker({ objective, speaker, onOpenHud }: Props) {
  const target = objective.target
  const content = (
    <>
      <span className={styles.label}>Задание от {speaker === 'Мастер Вереск' ? 'Вереска' : speaker}</span>
      <span className={styles.text}>{objective.text}</span>
    </>
  )
  return target.kind === 'hud' ? (
    <button type="button" className={`${styles.tracker} ${styles.clickable}`} onClick={() => onOpenHud(target.key)}>
      {content}
      <span className={styles.go} aria-hidden="true">
        ▸
      </span>
    </button>
  ) : (
    <div className={styles.tracker} role="status">
      {content}
    </div>
  )
}
