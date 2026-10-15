import type { CrystalCategory } from '../../api/types'
import { CrystalIcon } from '../../ui/icons/CrystalIcon'
import styles from './CrystalPicker.module.css'

type Props = {
  crystals: CrystalCategory[]
  value: string | null
  onChange: (key: string | null) => void
  name: string
}

/** Выбор категории кристалла: радиокнопки в виде камней. «Без кристалла» — тоже честный выбор. */
export function CrystalPicker({ crystals, value, onChange, name }: Props) {
  const selected = crystals.find((c) => c.key === value)

  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>Кристалл</legend>
      <div className={styles.options}>
        <label className={styles.option} title="Без кристалла">
          <input type="radio" name={name} checked={value === null} onChange={() => onChange(null)} />
          <span className={styles.none} aria-hidden="true" />
          <span className={styles.srOnly}>Без кристалла</span>
        </label>
        {crystals.map((crystal) => (
          <label key={crystal.key} className={styles.option} title={crystal.name}>
            <input type="radio" name={name} checked={value === crystal.key} onChange={() => onChange(crystal.key)} />
            <CrystalIcon color={crystal.color} size={24} />
            <span className={styles.srOnly}>{crystal.name}</span>
          </label>
        ))}
      </div>
      <p className={styles.hint}>
        {selected ? (
          <>
            <strong>{selected.name}</strong> — {selected.meaning.toLowerCase()}
          </>
        ) : (
          'Привычка будет приносить только Семена жизни.'
        )}
      </p>
    </fieldset>
  )
}
