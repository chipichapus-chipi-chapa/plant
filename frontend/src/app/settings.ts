import { createContext, useContext } from 'react'
import { telegramFullscreen } from './telegram'

/**
 * Настройки игры. Это удобства конкретного устройства (на телефоне может хотеться посветлее),
 * поэтому они живут в браузере, а не на сервере. Хранилище может быть недоступно (приватное окно) —
 * тогда игра просто работает с настройками по умолчанию.
 */
export type Settings = {
  /** Насколько темно в сумерках: dusk — как задумано, soft — светлее */
  brightness: 'dusk' | 'soft'
  /** Строки старого монитора поверх сцены */
  scanlines: boolean
  /** Светлячки над садом */
  fireflies: boolean
  /** Скорость появления текста в разговорах */
  textSpeed: 'normal' | 'fast' | 'instant'
}

export const DEFAULT_SETTINGS: Settings = { brightness: 'dusk', scanlines: true, fireflies: true, textSpeed: 'normal' }

export const SETTINGS_KEY = 'where-grows-settings'

export function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export type SettingsValue = { settings: Settings; change: (patch: Partial<Settings>) => void }

export const SettingsContext = createContext<SettingsValue>({ settings: DEFAULT_SETTINGS, change: () => {} })

export const useSettings = () => useContext(SettingsContext)

/** Сколько миллисекунд на букву в разговоре; 0 — сразу целиком. */
export const textDelay = (speed: Settings['textSpeed']) => (speed === 'instant' ? 0 : speed === 'fast' ? 8 : 22)

/** Полноэкранный режим: на телефоне заодно просим горизонтальную ориентацию (если браузер умеет). */
export async function enterFullscreen(): Promise<void> {
  if (telegramFullscreen(true)) return
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
    await orientation.lock?.('landscape')
  } catch {
    // браузер не разрешил — играем как есть, подсказка «поверните телефон» всё объяснит
  }
}

export async function exitFullscreen(): Promise<void> {
  if (telegramFullscreen(false)) return
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
  } catch {
    // ничего страшного
  }
}
