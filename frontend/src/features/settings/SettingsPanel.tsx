import { useEffect, useState } from 'react'
import { enterFullscreen, exitFullscreen, useSettings, type Settings } from '../../app/settings'
import { isFullscreen, onFullscreenChange } from '../../app/telegram'
import { AppSection } from './AppSection'
import styles from './SettingsPanel.module.css'

type Choice<K extends keyof Settings> = { key: K; label: string; options: { value: Settings[K]; label: string }[] }

const CHOICES = [
  { key: 'brightness', label: 'Сумерки', options: [{ value: 'dusk', label: 'Как задумано' }, { value: 'soft', label: 'Светлее' }] },
  {
    key: 'textSpeed',
    label: 'Текст в разговорах',
    options: [
      { value: 'normal', label: 'По буквам' },
      { value: 'fast', label: 'Быстро' },
      { value: 'instant', label: 'Сразу' },
    ],
  },
  { key: 'scanlines', label: 'Строки старого монитора', options: [{ value: true, label: 'Да' }, { value: false, label: 'Нет' }] },
  { key: 'fireflies', label: 'Светлячки', options: [{ value: true, label: 'Да' }, { value: false, label: 'Нет' }] },
] as Choice<keyof Settings>[]

/** Настройки: вид и удобство. Сохраняются в этом браузере. */
export function SettingsPanel() {
  const { settings, change } = useSettings()
  const [fullscreen, setFullscreen] = useState(isFullscreen)

  useEffect(() => onFullscreenChange(() => setFullscreen(isFullscreen())), [])

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.label}>Экран</span>
        <div className={styles.options}>
          <button type="button" className={fullscreen ? styles.on : styles.off} onClick={() => void enterFullscreen()}>
            Во весь экран
          </button>
          <button type="button" className={!fullscreen ? styles.on : styles.off} onClick={() => void exitFullscreen()}>
            В окне
          </button>
        </div>
      </div>
      {CHOICES.map((choice) => (
        <div key={choice.key} className={styles.row}>
          <span className={styles.label}>{choice.label}</span>
          <div className={styles.options} role="radiogroup" aria-label={choice.label}>
            {choice.options.map((option) => {
              const selected = settings[choice.key] === option.value
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={selected ? styles.on : styles.off}
                  onClick={() => change({ [choice.key]: option.value })}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <AppSection />
      <p className={styles.note}>Настройки хранятся на этом устройстве. Прогресс игры — на сервере, его они не трогают.</p>
    </div>
  )
}
