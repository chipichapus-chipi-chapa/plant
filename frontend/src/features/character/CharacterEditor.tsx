import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { saveProfile } from '../../api/game'
import type { Catalog, GameState } from '../../api/types'
import { loadAtlas, type Atlas } from '../../game/atlas'
import { composeCharacter, type Appearance } from '../../game/character'
import { Button } from '../../ui/Button'
import styles from './CharacterEditor.module.css'

type Props = {
  state: GameState
  catalog: Catalog
  /** Первое знакомство: другой текст кнопки и нет «Отмены» */
  firstTime: boolean
  onDone: () => Promise<void>
  onCancel: () => void
}

/** Создание и изменение персонажа: живое превью, имя, варианты по слотам из каталога. */
export function CharacterEditor({ state, catalog, firstTime, onDone, onCancel }: Props) {
  const [name, setName] = useState(firstTime ? '' : state.player.displayName)
  const [look, setLook] = useState<Appearance>(state.player.appearance)
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let active = true
    void loadAtlas().then((a) => active && setAtlas(a))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const ctx = previewRef.current?.getContext('2d')
    if (!ctx || !atlas) return
    ctx.clearRect(0, 0, 40, 64)
    ctx.drawImage(composeCharacter(atlas, look, catalog.appearance), 0, 0)
  }, [atlas, look, catalog.appearance])

  const choose = (slot: string, option: string) => setLook((current) => ({ ...current, [slot]: option }))

  const cycle = (slotKey: string, delta: number) => {
    const options = catalog.appearance.find((s) => s.key === slotKey)?.options ?? []
    const index = options.findIndex((o) => o.key === look[slotKey])
    choose(slotKey, options[(index + delta + options.length) % options.length].key)
  }

  const randomize = () => {
    const next: Appearance = {}
    for (const slot of catalog.appearance) {
      next[slot.key] = slot.options[Math.floor(Math.random() * slot.options.length)].key
    }
    setLook(next)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (name.trim() === '') {
      setError('Как вас зовут?')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveProfile(name, look)
      await onDone()
    } catch (e) {
      setError(e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось сохранить. Попробуйте ещё раз.')
      setBusy(false)
    }
  }

  return (
    <form className={styles.editor} onSubmit={submit} noValidate>
      {firstTime && (
        <p className={styles.intro}>
          Калитка скрипит, сад шуршит сухой травой. Кажется, он давно никого не ждал — но вам рад. Каким вы сюда пришли?
        </p>
      )}
      <div className={styles.layout}>
        <div className={styles.preview}>
          <canvas ref={previewRef} width={40} height={64} className={styles.canvas} aria-label="Как выглядит персонаж" />
          <Button onClick={randomize} className={styles.random}>
            Случайный облик
          </Button>
        </div>

        <div className={styles.fields}>
          <label className={styles.label} htmlFor="character-name">
            Имя
          </label>
          <input
            id="character-name"
            className={styles.input}
            value={name}
            maxLength={40}
            placeholder="Например, Вера"
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />

          {catalog.appearance.map((slot) =>
            slot.kind === 'STYLE' ? (
              <div key={slot.key} className={styles.row}>
                <span className={styles.label}>{slot.name}</span>
                <div className={styles.cycler}>
                  <button type="button" className={styles.arrow} aria-label={`${slot.name}: предыдущий`} onClick={() => cycle(slot.key, -1)}>
                    ◂
                  </button>
                  <span className={styles.value} aria-live="polite">
                    {slot.options.find((o) => o.key === look[slot.key])?.name}
                  </span>
                  <button type="button" className={styles.arrow} aria-label={`${slot.name}: следующий`} onClick={() => cycle(slot.key, 1)}>
                    ▸
                  </button>
                </div>
              </div>
            ) : (
              <fieldset key={slot.key} className={styles.row}>
                <legend className={styles.label}>{slot.name}</legend>
                <div className={styles.swatches}>
                  {slot.options.map((option) => (
                    <label key={option.key} className={styles.swatch} title={option.name}>
                      <input
                        type="radio"
                        name={`appearance-${slot.key}`}
                        checked={look[slot.key] === option.key}
                        onChange={() => choose(slot.key, option.key)}
                      />
                      <span className={styles.chip} style={{ background: option.color ?? undefined }} />
                      <span className={styles.srOnly}>{option.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ),
          )}
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>
          {firstTime ? 'Войти в сад' : 'Сохранить'}
        </Button>
        {!firstTime && (
          <Button onClick={onCancel} disabled={busy} className={styles.secondary}>
            Отмена
          </Button>
        )}
      </div>
    </form>
  )
}
