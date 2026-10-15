import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { RewardLine } from '../../lib/rewards'
import { CrystalIcon } from '../../ui/icons/CrystalIcon'
import { LifeSeedIcon } from '../../ui/icons/LifeSeedIcon'
import styles from './Toasts.module.css'

export type Toast = { message: string; reward?: RewardLine[] }

type Shown = Toast & { id: number }

const ToastContext = createContext<(toast: Toast) => void>(() => {})

const LIFETIME_MS = 4500
const MAX_VISIBLE = 3

/** Короткие уведомления в углу: что получено и что произошло. Сами исчезают, не требуют кликов. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Shown[]>([])
  const nextId = useRef(1)

  const push = useCallback((toast: Toast) => {
    const id = nextId.current++
    setToasts((current) => [...current, { ...toast, id }].slice(-MAX_VISIBLE))
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), LIFETIME_MS)
  }, [])

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack} aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            <p className={styles.message}>{toast.message}</p>
            {toast.reward && toast.reward.length > 0 && (
              <ul className={styles.reward}>
                {toast.reward.map((line) => (
                  <li key={line.itemKey} className={styles.line}>
                    {line.color ? <CrystalIcon color={line.color} /> : <LifeSeedIcon />}
                    <span>{line.label}</span>
                    <span className={styles.qty}>+{line.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Хук живёт рядом с провайдером: так их проще менять вместе
// eslint-disable-next-line react/only-export-components
export const useToast = () => useContext(ToastContext)
