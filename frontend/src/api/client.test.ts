import { describe, expect, it } from 'vitest'
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
    const notJson = async () => new Response('<html>Bad gateway</html>', { status: 502 })
    await expect(apiFetch('/api/x', undefined, notJson)).rejects.toMatchObject({ kind: 'http', status: 502, title: 'Ошибка 502' })
  })

  it('сообщает о сетевой ошибке отдельно от HTTP-ошибок', async () => {
    const offline = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(apiFetch('/api/x', undefined, offline)).rejects.toMatchObject({ kind: 'network', status: null })
  })
})
