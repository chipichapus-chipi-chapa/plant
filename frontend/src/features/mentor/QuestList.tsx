import type { GameState } from '../../api/types'
import { questCount, type Quests } from '../../game/quests'
import styles from './QuestList.module.css'

type Props = {
  quests: Quests
  state: GameState
  /** Цель — кнопка панели: нажатие на задание сразу открывает нужное окно */
  onOpenHud: (key: string) => void
}

/**
 * Окно «Задания» — как лавка или сумка: открывается кнопкой на панели и не загораживает сад.
 * Сверху — задание от Вереска, ниже — поручения жителей (у оживления — сколько проснулось) и туман.
 */
export function QuestList({ quests, state, onOpenHud }: Props) {
  const { objective, errands, fog } = quests
  if (questCount(quests) === 0) {
    return <p className={styles.empty}>Пока заданий нет. Загляните к Вереску или к жителям — у кого-то найдётся просьба.</p>
  }
  const target = objective?.target
  return (
    <ul className={styles.list}>
      {objective && (
        <li className={`${styles.item} ${styles.main}`}>
          <span className={styles.who}>Мастер Вереск</span>
          <span className={styles.goal}>{objective.text}</span>
          {target?.kind === 'hud' && (
            <button type="button" className={styles.go} onClick={() => onOpenHud(target.key)}>
              Открыть ▸
            </button>
          )}
        </li>
      )}
      {fog && (
        <li className={styles.item}>
          <span className={styles.who}>{fog.teller.name}</span>
          <span className={styles.goal}>Туман над озером редеет — возвращайтесь к привычкам. Каждый день — новая зарубка на причале.</span>
          <span className={styles.progress}>{fog.days} из {fog.needed} дней</span>
        </li>
      )}
      {errands.map((npc) => {
        const errand = npc.errand!
        const revive = errand.kind === 'REVIVE' ? (errand.props ?? []) : []
        const awake = revive.filter((key) => state.worldObjects.some((w) => w.objectKey === key)).length
        return (
          <li key={errand.key} className={styles.item}>
            <span className={styles.who}>{npc.name}</span>
            <span className={styles.goal}>{errand.goal}</span>
            {revive.length > 0 && <span className={styles.progress}>проснулось {awake} из {revive.length}</span>}
          </li>
        )
      })}
    </ul>
  )
}
