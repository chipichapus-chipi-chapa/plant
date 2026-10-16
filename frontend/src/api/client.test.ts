import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './client'

const respond = (body: unknown, status = 200) => async () =>
  new Response(body === undefined ? null : JSON.stringify(body), { status })

describe('apiFetch', () => {
  it('возвращает тело успешного ответа', async () => {
    await expect(apiFetch('/api/x', undefined, respond({ coins: 10 }))).resolves.toEqual({ coins: 10 })
  })

  it('переводит Problem Details в ApiError', async () => {
    const error = await apiFetch('/api/x', undefined, respond({ title: 'Недостаточно росинок', detail: 'Нужно 5' }, 409)).catch(
      (e: unknown) => e,
    )
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'http', status: 409, title: 'Недостаточно росинок', detail: 'Нужно 5' })
  })

  it('не падает, если тело ошибки не JSON', async () => {
    const notJson = async () => new Response('<html>Oops</html>', { status: 500 })
    await expect(apiFetch('/api/x', undefined, notJson)).rejects.toMatchObject({ kind: 'http', status: 500, title: 'Ошибка 500' })
  })

  it('считает ответ шлюза 502 недоступностью сервера', async () => {
    await expect(apiFetch('/api/x', undefined, respond(undefined, 502))).rejects.toMatchObject({ kind: 'network', status: 502 })
  })

  it('сообщает о сетевой ошибке отдельно от HTTP-ошибок', async () => {
    const offline = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(apiFetch('/api/x', undefined, offline)).rejects.toMatchObject({ kind: 'network', status: null })
  })

  describe('в Telegram', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('прикладывает подписанную initData и часовой пояс', async () => {
      vi.stubGlobal('window', { Telegram: { WebApp: { initData: 'user=1&hash=ab' } } })
      let headers: Record<string, string> = {}
      const capture = async (_: RequestInfo | URL, init?: RequestInit) => {
        headers = init?.headers as Record<string, string>
        return new Response('{}', { status: 200 })
      }
      await apiFetch('/api/x', undefined, capture)
      expect(headers['X-Telegram-Init-Data']).toBe('user=1&hash=ab')
      expect(headers['X-Timezone']).toBeTruthy()
    })

    it('в обычном браузере ничего не добавляет', async () => {
      let headers: Record<string, string> = {}
      const capture = async (_: RequestInfo | URL, init?: RequestInit) => {
        headers = init?.headers as Record<string, string>
        return new Response('{}', { status: 200 })
      }
      await apiFetch('/api/x', undefined, capture)
      expect(headers['X-Telegram-Init-Data']).toBeUndefined()
    })
  })
})
