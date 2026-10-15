/**
 * Тонкая обёртка над fetch. Backend отвечает на ошибки в формате
 * Problem Details (RFC 9457): { title, status, detail, ... }.
 * Здесь любая неудача превращается в ApiError, чтобы UI обрабатывал
 * ошибки одним способом и показывал человеку понятный текст.
 */

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

export async function apiFetch<T>(path: string, init?: RequestInit, fetchImpl: typeof fetch = fetch): Promise<T> {
  let response: Response
  try {
    response = await fetchImpl(path, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    })
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
