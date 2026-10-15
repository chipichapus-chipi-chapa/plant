import { useEffect, useState } from 'react'
import { apiFetch } from '../../api/client'
import styles from './ServerStatus.module.css'

type Status = 'checking' | 'up' | 'down'

async function probe(): Promise<Status> {
  try {
    const health = await apiFetch<{ status: string }>('/actuator/health')
    return health.status === 'UP' ? 'up' : 'down'
  } catch {
    return 'down'
  }
}

/** Показывает, доступен ли backend (и через него — база данных). */
export function ServerStatus() {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    let active = true
    void probe().then((result) => active && setStatus(result))
    return () => {
      active = false
    }
  }, [])

  const retry = () => {
    setStatus('checking')
    void probe().then(setStatus)
  }

  return (
    <div className={styles.status} role="status">
      <span className={`${styles.dot} ${styles[status]}`} aria-hidden="true" />
      {status === 'checking' && 'Стучимся в калитку…'}
      {status === 'up' && 'Сад на связи'}
      {status === 'down' && (
        <>
          Сервер молчит
          <button type="button" className={styles.retry} onClick={retry}>
            Ещё раз
          </button>
        </>
      )}
    </div>
  )
}
