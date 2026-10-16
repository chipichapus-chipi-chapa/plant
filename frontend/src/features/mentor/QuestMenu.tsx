import { useState } from 'react'
import type { Catalog, GameState } from '../../api/types'
import type { Objective } from '../../game/guidance'
import styles from './QuestMenu.module.css'

type Props = {
  objective: Objective | null
  state: GameState
  catalog: Catalog
  /** Цель — кнопка панели: нажатие на задание сразу открывает нужное окно */
  onOpenHud: (key: string) => void
}

const KEY = 'where-grows-quests-open'

const remembered = () => {
  try {
    return window.localStorage.getItem(KEY) !== '0'
  } catch {
    return true
  }
}

/**
 * Задания выпадающим списком: маленькая кнопка «Задания · N», по нажатию — список.
 * Сверху — задание от Вереска, ниже — поручения жителей (у оживления сада — сколько уже проснулось).
 * Свёрнут список или нет, помнит браузер.
 */
export function QuestMenu({ objective, state, catalog, onOpenHud }: Props) {
  const [open, setOpen] = useState(remembered)
  const errands = catalog.locations
    .flatMap((l) => l.npcs ?? [])
    .filter((n) => n.errand && state.errands.some((e) => e.key === n.errand!.key && e.offered && !e.done))
  const count = (objective ? 1 : 0) + errands.length
  if (count === 0) return null

  const toggle = () => {
    setOpen((value) => {
      try {
        window.localStorage.setItem(KEY, value ? '0' : '1')
      } catch {
        // не запомнилось — не страшно
      }
      return !value
    })
  }
  const target = objective?.target

  return (
    <div className={styles.menu}>
      <button type="button" className={styles.toggle} onClick={toggle} aria-expanded={open}>
        Задания · {count} <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <ul className={styles.list}>
          {objective && (
            <li>
              {target?.kind === 'hud' ? (
                <button type="button" className={`${styles.item} ${styles.main}`} onClick={() => onOpenHud(target.key)}>
                  <span className={styles.who}>Вереск</span> {objective.text} ▸
                </button>
              ) : (
                <span className={`${styles.item} ${styles.main}`}>
                  <span className={styles.who}>Вереск</span> {objective.text}
                </span>
              )}
            </li>
          )}
          {errands.map((npc) => {
            const errand = npc.errand!
            const revive = errand.kind === 'REVIVE' ? (errand.props ?? []) : []
            const awake = revive.filter((key) => state.worldObjects.some((w) => w.objectKey === key)).length
            return (
              <li key={errand.key}>
                <span className={styles.item}>
                  <span className={styles.who}>{npc.name}</span> {errand.goal}
                  {revive.length > 0 && <span className={styles.progress}> {awake}/{revive.length}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
