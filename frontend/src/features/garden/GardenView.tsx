import { useEffect, useState } from 'react'
import type { GardenMap } from '../../api/types'
import { loadAtlas, type Atlas } from '../../game/atlas'
import { GardenCanvas } from '../../game/GardenCanvas'
import { describeCell, type Cell } from '../../game/layout'
import styles from './GardenView.module.css'

type AtlasLoad = { status: 'loading' } | { status: 'ready'; atlas: Atlas } | { status: 'error' }

/** Сад и подпись под ним: что находится в выбранной клетке. */
export function GardenView({ map }: { map: GardenMap }) {
  const [atlas, setAtlas] = useState<AtlasLoad>({ status: 'loading' })
  const [selected, setSelected] = useState<Cell | null>(null)

  useEffect(() => {
    let active = true
    loadAtlas()
      .then((loaded) => active && setAtlas({ status: 'ready', atlas: loaded }))
      .catch(() => active && setAtlas({ status: 'error' }))
    return () => {
      active = false
    }
  }, [])

  const info = selected ? describeCell(map, selected) : null

  return (
    <section className={styles.garden} aria-label={map.name}>
      {atlas.status === 'ready' ? (
        <GardenCanvas map={map} atlas={atlas.atlas} selected={selected} onSelect={setSelected} />
      ) : (
        <div className={styles.placeholder} style={{ aspectRatio: `${map.width} / ${map.height}` }}>
          <p className={styles.note}>
            {atlas.status === 'loading' ? 'Раздвигаем ветки…' : 'Картинки сада не загрузились. Обновите страницу.'}
          </p>
        </div>
      )}

      <div className={styles.info} aria-live="polite">
        {info ? (
          <>
            <strong>{info.name}.</strong> {info.description}
          </>
        ) : (
          <span className={styles.hint}>Нажмите на клетку сада, чтобы рассмотреть её поближе.</span>
        )}
      </div>
    </section>
  )
}
