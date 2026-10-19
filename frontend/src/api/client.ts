/**
 * Тонкая обёртка над fetch. Backend отвечает на ошибки в формате
 * Problem Details (RFC 9457): { title, status, detail, ... }.
 * Здесь любая неудача превращается в ApiError, чтобы UI обрабатывал
 * ошибки одним способом и показывал человеку понятный текст.
 */

import { telegramInitData } from '../app/telegram'

/** network — до сервера не достучаться (нет сети или шлюз не видит backend); http — сервер ответил ошибкой */
export type ApiErrorKind = 'network' | 'http'

// Так отвечает прокси/шлюз, когда сам backend недоступен
const GATEWAY_STATUSES = new Set([502, 503, 504])

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly title: string
  readonly detail: string | null

  constructor(kind: ApiErrorKind, status: number | null, title: string, detail: string | null) {
    super(detail ?? title)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.title = title
    this.detail = detail
  }
}

type ProblemDetail = { title?: unknown; detail?: unknown }

async function readProblem(response: Response): Promise<ProblemDetail> {
  try {
    const body: unknown = await response.json()
    return typeof body === 'object' && body !== null ? (body as ProblemDetail) : {}
  } catch {
    return {}
  }
}

/**
 * Адрес сервера. Локально пусто — запросы идут через прокси Vite; на GitHub Pages сервер живёт
 * на другом домене, и адрес задаётся при сборке (VITE_API_URL).
 */
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

/**
 * Вход в приложении без регистрации: сервер один раз выдаёт ключ устройства, он хранится в браузере
 * и уходит в каждом запросе. Включается при сборке сайта (VITE_DEVICE_LOGIN) — локальный сервер
 * работает без входа. Читается при каждом вызове, чтобы тесты могли его переключать.
 */
export const deviceLoginEnabled = () => import.meta.env.VITE_DEVICE_LOGIN === 'true' && !telegramInitData()

const DEVICE_KEY = 'where-grows-device'
// если хранилище недоступно (приватный режим) — ключ живёт до закрытия вкладки
let memoryToken: string | null = null
let registering: Promise<string> | null = null

function storedToken(): string | null {
  try {
    return localStorage.getItem(DEVICE_KEY) ?? memoryToken
  } catch {
    return memoryToken
  }
}

function storeToken(token: string | null) {
  memoryToken = token
  try {
    if (token) localStorage.setItem(DEVICE_KEY, token)
    else localStorage.removeItem(DEVICE_KEY)
  } catch {
    // хранилище недоступно — обойдёмся памятью
  }
}

/** Ключ устройства; при первом запуске сервер заводит новый сад. Параллельные запросы ждут одну регистрацию. */
function deviceToken(fetchImpl: typeof fetch): Promise<string> {
  const known = storedToken()
  if (known) return Promise.resolve(known)
  registering ??= (async () => {
    const response = await fetchImpl(API_URL + '/api/auth/device', {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-Timezone': timezone() },
    })
    if (!response.ok) throw new Error(`регистрация устройства: ${response.status}`)
    const { token } = (await response.json()) as { token: string }
    storeToken(token)
    return token
  })().finally(() => {
    registering = null
  })
  return registering
}

/** Заголовки входа: из Telegram — подписанная initData, из приложения — ключ устройства. */
async function loginHeaders(fetchImpl: typeof fetch): Promise<Record<string, string>> {
  const initData = telegramInitData()
  if (initData) return { 'X-Telegram-Init-Data': initData, 'X-Timezone': timezone() }
  if (deviceLoginEnabled()) return { 'X-Device-Token': await deviceToken(fetchImpl), 'X-Timezone': timezone() }
  return {}
}

export async function apiFetch<T>(path: string, init?: RequestInit, fetchImpl: typeof fetch = fetch): Promise<T> {
  let response: Response
  try {
    const send = async () =>
      fetchImpl(API_URL + path, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
          ...(await loginHeaders(fetchImpl)),
          ...init?.headers,
        },
      })
    response = await send()
    if (response.status === 401 && deviceLoginEnabled() && storedToken()) {
      // сервер не знает этот ключ (например, база пересоздана) — заводим сад заново и повторяем один раз
      storeToken(null)
      response = await send()
    }
  } catch {
    throw new ApiError('network', null, 'Нет связи с сервером', null)
  }

  if (GATEWAY_STATUSES.has(response.status)) {
    throw new ApiError('network', response.status, 'Нет связи с сервером', null)
  }

  if (!response.ok) {
    const problem = await readProblem(response)
    throw new ApiError(
      'http',
      response.status,
      typeof problem.title === 'string' ? problem.title : `Ошибка ${response.status}`,
      typeof problem.detail === 'string' ? problem.detail : null,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}
