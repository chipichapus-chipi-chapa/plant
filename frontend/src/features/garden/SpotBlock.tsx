import { useState } from 'react'
import { ApiError } from '../../api/client'
import { searchSpot } from '../../api/game'
import type { Catalog, GameState } from '../../api/types'
import { describeReward } from '../../lib/rewards'
import { Button } from '../../ui/Button'
import { useToast } from '../notifications/Toasts'
import styles from './RecipeBlock.module.css'

type Props = {
  spotKey: string
  state: GameState
  catalog: Catalog
  onChanged: () => Promise<void>
}

/** Место находки у постройки: кнопка со своей надписью («Осмотреть», «Подвести стрелки»…), после находки — тихая пометка. */
export function SpotBlock({ spotKey, state, catalog, onChanged }: Props) {
  const [busy, setBusy] = useState(false)
  const [lastText, setLastText] = useState<string | null>(null)
  const toast = useToast()
  const searched = state.searchedSpots.includes(spotKey)

  const search = async () => {
    setBusy(true)
    try {
      const result = await searchSpot(spotKey)
      setLastText(result.text)
      if (result.outcome === 'FOUND') {
        toast({
          message: result.text,
          reward: describeReward(result.reward, catalog),
          artifact: result.artifact?.name,
        })
        await onChanged()
      }
    } catch (e) {
      toast({ message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось осмотреться. Попробуйте ещё раз.' })
    } finally {
      setBusy(false)
    }
  }

  if (searched) {
    return <p className={styles.hint}>{lastText ?? 'Здесь вы уже всё нашли.'}</p>
  }
  return (
    <div className={styles.recipe}>
      {lastText && <p className={styles.hint}>{lastText}</p>}
      <Button onClick={() => void search()} disabled={busy}>
        {catalog.spots.find((s) => s.key === spotKey)?.actionLabel ?? 'Осмотреть'}
      </Button>
    </div>
  )
}
