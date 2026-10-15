import { LIFE_SEED, SUN_SPARK } from '../../api/types'
import { CrystalIcon } from './CrystalIcon'
import { LifeSeedIcon } from './LifeSeedIcon'
import { SeedPacketIcon } from './SeedPacketIcon'
import { SunSparkIcon } from './SunSparkIcon'

/** Иконка предмета по его ключу и (для осколков) цвету кристалла. */
export function ItemIcon({ itemKey, color, size = 16 }: { itemKey: string; color?: string | null; size?: number }) {
  if (itemKey === LIFE_SEED) return <LifeSeedIcon size={size} />
  if (itemKey === SUN_SPARK) return <SunSparkIcon size={size} />
  if (color) return <CrystalIcon color={color} size={size} />
  return <SeedPacketIcon size={size} />
}
