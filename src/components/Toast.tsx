import { useSyncExternalStore } from 'react'
import { uid } from '../lib/util'

interface Toast {
  id: string
  text: string
  action?: { label: string; run: () => void }
}

let toasts: Toast[] = []
const subs = new Set<() => void>()
const emit = () => subs.forEach((s) => s())

export function toast(text: string, action?: Toast['action'], ms = 3800) {
  const t = { id: uid(), text, action }
  toasts = [...toasts.slice(-2), t]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id)
    emit()
  }, ms)
}

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      subs.add(l)
      return () => subs.delete(l)
    },
    () => toasts,
  )
  return (
    <div className="toaster" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="toast">
          <span>{t.text}</span>
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                t.action!.run()
                toasts = toasts.filter((x) => x.id !== t.id)
                emit()
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
