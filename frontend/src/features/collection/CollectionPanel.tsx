import type { Catalog, GameState } from '../../api/types'
import { CrystalIcon } from '../../ui/icons/CrystalIcon'
import styles from './CollectionPanel.module.css'

type Props = { state: GameState; catalog: Catalog }

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Коллекция артефактов. Найденные — с описанием, легендой, датой и местом находки;
 * ненайденные — силуэтами с подсказкой, где искать. Артефакты не расходуются.
 */
export function CollectionPanel({ state, catalog }: Props) {
  const found = new Map(state.artifacts.map((a) => [a.key, a]))
  const colors = new Map(catalog.crystals.map((c) => [c.key, c]))
  const placeName = (spotKey: string) => {
    const propKey = catalog.spots.find((s) => s.key === spotKey)?.propKey
    // находки бывают во всех локациях: в сарае, на тропе, в поместье, у озера
    return catalog.locations.flatMap((l) => l.props).find((p) => p.key === propKey)?.name ?? 'где-то в саду'
  }
  // секретки — тайники без мерцания: сколько уже найдено, без подсказок где
  const secrets = catalog.spots.filter((s) => s.hidden)
  const secretsFound = secrets.filter((s) => state.searchedSpots.includes(s.key)).length

  return (
    <div className={styles.collection}>
      <p className={styles.counter}>
        Найдено: {found.size} из {catalog.artifacts.length}
        {secrets.length > 0 && (
          <>
            {' · '}Секреты: {secretsFound} из {secrets.length}
          </>
        )}
      </p>
      <ul className={styles.list}>
        {catalog.artifacts.map((artifact) => {
          const entry = found.get(artifact.key)
          const crystal = colors.get(artifact.crystalCategory)
          return (
            <li key={artifact.key} className={entry ? styles.card : `${styles.card} ${styles.unknown}`}>
              <div className={entry ? styles.frame : `${styles.frame} ${styles.silhouette}`}>
                <CrystalIcon color={crystal?.color ?? '#888888'} size={48} muted={!entry} />
              </div>
              {entry ? (
                <div className={styles.text}>
                  <h3 className={styles.name}>{artifact.name}</h3>
                  <p className={styles.category}>{crystal?.name}</p>
                  <p>{artifact.description}</p>
                  <p className={styles.legend}>{artifact.legend}</p>
                  <p className={styles.effect}>{artifact.effectText}</p>
                  <p className={styles.found}>
                    Найдено {dateFormat.format(new Date(entry.foundAt))} — {placeName(entry.foundWhere)}
                  </p>
                </div>
              ) : (
                <div className={styles.text}>
                  <h3 className={styles.name}>???</h3>
                  <p className={styles.hint}>{artifact.acquisitionHint}</p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
