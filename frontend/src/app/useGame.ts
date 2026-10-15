import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { fetchCatalog, fetchGameState } from '../api/game'
import type { Catalog, GameState } from '../api/types'

export type GameLoad =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'ready'; state: GameState; catalog: Catalog }

const toApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError('network', null, 'Что-то пошло не так', null))

async function loadGame(): Promise<GameLoad> {
  try {
    const [state, catalog] = await Promise.all([fetchGameState(), fetchCatalog()])
    return { status: 'ready', state, catalog }
  } catch (e) {
    return { status: 'error', error: toApiError(e) }
  }
}

/**
 * Загружает состояние игрока и каталог.
 * reload — полная перезагрузка (кнопка «попробовать снова»);
 * refresh — тихо перечитывает состояние после действия игрока: баланс на экране
 * всегда берётся с сервера, а не досчитывается в браузере.
 */
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

  const refresh = useCallback(async () => {
    const state = await fetchGameState()
    setGame((current) => (current.status === 'ready' ? { ...current, state } : current))
  }, [])

  return { game, reload, refresh }
}
