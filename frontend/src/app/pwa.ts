/**
 * Приложение на экране телефона (PWA): установка и офлайн-кэш графики.
 * В Telegram ничего из этого не нужно — там игра и так открывается как приложение.
 */
import { telegramApp } from './telegram'

/** Запущено внутри APK (Capacitor): там игра уже приложение — ни установки, ни сервис-воркера не нужно. */
export const isNativeApp = () =>
  !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: InstallPrompt | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

/** Открыто как установленное приложение (с экрана «Домой»), а не во вкладке браузера. */
export const isInstalled = () =>
  isNativeApp() ||
  window.matchMedia?.('(display-mode: fullscreen), (display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** iPhone/iPad: там установка только вручную, через «Поделиться → На экран „Домой“». */
export const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Браузер готов показать своё окно установки (Android Chrome, десктопный Chrome/Edge). */
export const canPromptInstall = () => deferred !== null

export async function promptInstall(): Promise<void> {
  const prompt = deferred
  if (!prompt) return
  deferred = null
  notify()
  await prompt.prompt()
}

export function onInstallChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Сервис-воркер и перехват окна установки. Только на собранном сайте и не в Telegram. */
export function setupPwa(): void {
  if (!import.meta.env.PROD || telegramApp() || isNativeApp()) return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // покажем свою кнопку в настройках, а не баннер браузера
    deferred = e as InstallPrompt
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // без кэша игра всё равно работает — просто грузит графику по сети
    })
  }
}
