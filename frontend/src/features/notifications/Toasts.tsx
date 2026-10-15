import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import type { RewardLine } from '../../lib/rewards'
import { ItemIcon } from '../../ui/icons/ItemIcon'
import styles from './Toasts.module.css'

/** artifact — название артефакта, попавшего в коллекцию */
export type Toast = { message: string; reward?: RewardLine[]; artifact?: string }

type Shown = Toast & { id: number }

const ToastContext = createContext<(toast: Toast) => void>(() => {})

// Длинные тексты (находки, магия) держим дольше, чтобы их успели прочитать
const lifetime = (toast: Toast) => Math.min(10_000, 3000 + toast.message.length * 45)
const MAX_VISIBLE = 3

/** Короткие уведомления в углу: что получено и что произошло. Сами исчезают, не требуют кликов. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Shown[]>([])
  const nextId = useRef(1)

  const push = useCallback((toast: Toast) => {
    const id = nextId.current++
    setToasts((current) => [...current, { ...toast, id }].slice(-MAX_VISIBLE))
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), lifetime(toast))
  }, [])

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack} aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            <p className={styles.message}>{toast.message}</p>
            {toast.artifact && <p className={styles.artifact}>В коллекцию: {toast.artifact}</p>}
            {toast.reward && toast.reward.length > 0 && (
              <ul className={styles.reward}>
                {toast.reward.map((line) => (
                  <li key={line.itemKey} className={styles.line}>
                    <ItemIcon itemKey={line.itemKey} color={line.color} />
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
