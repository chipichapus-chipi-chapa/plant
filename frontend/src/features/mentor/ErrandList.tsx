import type { Catalog, GameState } from '../../api/types'
import styles from './QuestTracker.module.css'

type Props = { state: GameState; catalog: Catalog }

/**
 * Взятые поручения жителей — под заданием Вереска, по строчке на каждое. Отдают вещи прямо нажатием
 * на жителя, поэтому здесь видно, кто что просил; у оживления сада — сколько уже проснулось.
 */
export function ErrandList({ state, catalog }: Props) {
  const active = catalog.locations
    .flatMap((l) => l.npcs ?? [])
    .filter((n) => n.errand && state.errands.some((e) => e.key === n.errand!.key && e.offered && !e.done))
  if (active.length === 0) return null
  return (
    <ul className={styles.errands} aria-label="Поручения жителей">
      {active.map((npc) => {
        const errand = npc.errand!
        const revive = errand.kind === 'REVIVE' ? (errand.props ?? []) : []
        const awake = revive.filter((key) => state.worldObjects.some((w) => w.objectKey === key)).length
        return (
          <li key={errand.key} className={styles.errand}>
            <span className={styles.who}>{npc.name}</span> {errand.goal}
            {revive.length > 0 && ` — ${awake}/${revive.length}`}
          </li>
        )
      })}
    </ul>
  )
}
