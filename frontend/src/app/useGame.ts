import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { fetchCatalog, fetchGameState } from '../api/game'
import type { Catalog, GameState } from '../api/types'

export type GameLoad =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'ready'; state: GameState; catalog: Catalog }

async function loadGame(): Promise<GameLoad> {
  try {
    const [state, catalog] = await Promise.all([fetchGameState(), fetchCatalog()])
    return { status: 'ready', state, catalog }
  } catch (e) {
    const error = e instanceof ApiError ? e : new ApiError('network', null, 'Что-то пошло не так', null)
    return { status: 'error', error }
  }
}

/** Загружает состояние игрока и каталог; reload — для кнопки «попробовать снова». */
export function useGame() {
  const [game, setGame] = useState<GameLoad>({ status: 'loading' })

  useEffect(() => {
    let active = true
    void loadGame().then((result) => active && setGame(result))
    return () => {
      active = false
    }
  }, [])

  const reload = useCallback(() => {
    setGame({ status: 'loading' })
    void loadGame().then(setGame)
  }, [])

  return { game, reload }
}
