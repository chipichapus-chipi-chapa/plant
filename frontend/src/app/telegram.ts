/**
 * Telegram Mini App: игра открывается кнопкой у бота. Скрипт telegram-web-app.js (в index.html)
 * кладёт сюда window.Telegram.WebApp; в обычном браузере его нет, и всё работает как раньше.
 */

type WebApp = {
  initData: string
  version: string
  ready: () => void
  expand: () => void
  isVersionAtLeast?: (version: string) => boolean
  requestFullscreen?: () => void
  exitFullscreen?: () => void
  isFullscreen?: boolean
  disableVerticalSwipes?: () => void
  onEvent?: (event: string, handler: () => void) => void
  offEvent?: (event: string, handler: () => void) => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
}

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp }
  }
}

/** WebApp только если игра действительно открыта из Telegram (а не просто загружен скрипт). */
export function telegramApp(): WebApp | null {
  // в тестах (Node) окна нет
  const app = typeof window === 'undefined' ? undefined : window.Telegram?.WebApp
  return app && app.initData ? app : null
}

/** Подписанная строка входа: сервер проверяет её токеном бота. */
export const telegramInitData = () => telegramApp()?.initData ?? ''

const atLeast = (app: WebApp, version: string) => app.isVersionAtLeast?.(version) ?? false

/** Сразу после загрузки: развернуть окно на всю высоту и не закрывать его свайпом вниз во время игры. */
export function setupTelegram(): void {
  const app = telegramApp()
  if (!app) return
  app.ready()
  app.expand()
  if (atLeast(app, '7.7')) app.disableVerticalSwipes?.()
  if (atLeast(app, '6.1')) {
    app.setHeaderColor?.('#1b1a24')
    app.setBackgroundColor?.('#1b1a24')
  }
}

/** Настоящий полноэкранный режим Telegram (с версии 8.0); false — если клиент его не умеет. */
export function telegramFullscreen(on: boolean): boolean {
  const app = telegramApp()
  if (!app || !atLeast(app, '8.0')) return false
  if (on) app.requestFullscreen?.()
  else app.exitFullscreen?.()
  return true
}

/** Включён ли полноэкранный режим — телеграмовский или браузерный. */
export const isFullscreen = () => !!telegramApp()?.isFullscreen || !!document.fullscreenElement

/** Подписка на вход и выход из полноэкранного режима; возвращает отписку. */
export function onFullscreenChange(handler: () => void): () => void {
  const app = telegramApp()
  document.addEventListener('fullscreenchange', handler)
  app?.onEvent?.('fullscreenChanged', handler)
  return () => {
    document.removeEventListener('fullscreenchange', handler)
    app?.offEvent?.('fullscreenChanged', handler)
  }
}
