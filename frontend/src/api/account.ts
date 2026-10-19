import { apiFetch } from './client'

/** Связан ли сад с Telegram (тогда он общий с ботом). */
export const fetchAccount = () => apiFetch<{ telegram: boolean }>('/api/auth/account')

/** Одноразовая ссылка на бота: «Старт» в боте свяжет сад приложения с Telegram. */
export const startTelegramLink = () => apiFetch<{ code: string; url: string }>('/api/auth/telegram-link', { method: 'POST' })

export const fetchLinkStatus = (code: string) =>
  apiFetch<{ linked: boolean }>(`/api/auth/telegram-link/${encodeURIComponent(code)}`)
