import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { loadSettings, SettingsContext, SETTINGS_KEY, type Settings } from './settings'

/** Хранит настройки игры и сохраняет их в браузере при каждом изменении. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const change = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      } catch {
        // не сохранилось — настройка всё равно действует до перезагрузки
      }
      return next
    })
  }, [])
  const value = useMemo(() => ({ settings, change }), [settings, change])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

