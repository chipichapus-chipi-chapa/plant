import { useEffect, useRef, useState } from 'react'
import { fetchAccount, fetchLinkStatus, startTelegramLink } from '../../api/account'
import { ApiError, deviceLoginEnabled } from '../../api/client'
import { canPromptInstall, isInstalled, isIos, onInstallChange, promptInstall } from '../../app/pwa'
import styles from './SettingsPanel.module.css'

const POLL_MS = 2500

/**
 * Приложение: установка на экран телефона и привязка сада к Telegram.
 * Показывается только вне Telegram — в боте игра и так связана с аккаунтом.
 */
export function AppSection() {
  if (!deviceLoginEnabled()) return null
  return (
    <>
      <InstallRow />
      <TelegramRow />
    </>
  )
}

function InstallRow() {
  const [, rerender] = useState(0)
  useEffect(() => onInstallChange(() => rerender((n) => n + 1)), [])
  if (isInstalled()) return null
  return (
    <div className={styles.row}>
      <span className={styles.label}>Приложение</span>
      {canPromptInstall() ? (
        <div className={styles.options}>
          <button type="button" className={styles.on} onClick={() => void promptInstall()}>
            Установить на экран
          </button>
        </div>
      ) : (
        <p className={styles.note}>
          {isIos()
            ? 'Чтобы игра была на экране как приложение: в Safari нажмите «Поделиться» → «На экран „Домой“».'
            : 'Чтобы игра была на экране как приложение: в меню браузера выберите «Установить приложение» или «Добавить на главный экран».'}
        </p>
      )}
    </div>
  )
}

type LinkState =
  | { kind: 'loading' }
  | { kind: 'unlinked' }
  | { kind: 'waiting'; code: string }
  | { kind: 'linked' }
  | { kind: 'error'; message: string }

function TelegramRow() {
  const [state, setState] = useState<LinkState>({ kind: 'loading' })
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    fetchAccount()
      .then((a) => alive.current && setState({ kind: a.telegram ? 'linked' : 'unlinked' }))
      .catch(() => alive.current && setState({ kind: 'unlinked' }))
    return () => {
      alive.current = false
    }
  }, [])

  // Ждём, пока в боте нажмут «Старт»; как только сад связан — перезапускаем игру с ним
  useEffect(() => {
    if (state.kind !== 'waiting') return
    const timer = window.setInterval(() => {
      fetchLinkStatus(state.code)
        .then((s) => {
          if (s.linked) window.location.reload()
        })
        .catch(() => {
          // сеть моргнула — спросим в следующий раз
        })
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [state])

  const link = async () => {
    // окно открываем сразу по клику — иначе браузер посчитает его всплывающей рекламой и заблокирует
    const tab = window.open('', '_blank')
    try {
      const { code, url } = await startTelegramLink()
      if (tab) tab.location.href = url
      else window.location.href = url
      setState({ kind: 'waiting', code })
    } catch (e) {
      tab?.close()
      setState({ kind: 'error', message: e instanceof ApiError ? (e.detail ?? e.title) : 'Не получилось. Попробуйте ещё раз.' })
    }
  }

  return (
    <div className={styles.row}>
      <span className={styles.label}>Сад и Telegram</span>
      {state.kind === 'linked' ? (
        <p className={styles.note}>Сад связан с Telegram: он один и тот же здесь и в боте.</p>
      ) : state.kind === 'waiting' ? (
        <p className={styles.note}>Нажмите «Старт» в открывшемся боте — сад свяжется, и игра обновится сама.</p>
      ) : (
        <>
          <div className={styles.options}>
            <button type="button" className={styles.on} disabled={state.kind === 'loading'} onClick={() => void link()}>
              Привязать Telegram
            </button>
          </div>
          <p className={styles.note}>
            {state.kind === 'error'
              ? state.message
              : 'Сад сохранится, и в него можно будет заходить и отсюда, и из бота. Если в боте уже есть сад — здесь откроется он.'}
          </p>
        </>
      )}
    </div>
  )
}
