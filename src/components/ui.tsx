// Shared UI primitives: toasts, modal, spinner, empty state, error banner.
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

// --- Toasts ---------------------------------------------------
type ToastKind = 'ok' | 'err' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  msg: string
}
interface ToastCtx {
  toast: (msg: string, kind?: ToastKind) => void
}
const ToastContext = createContext<ToastCtx | null>(null)

let toastId = 0
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = useCallback((msg: string, kind: ToastKind = 'info') => {
    const id = ++toastId
    setToasts((t) => [...t, { id, kind, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
export function useToast() {
  const v = useContext(ToastContext)
  if (!v) throw new Error('useToast must be used within ToastProvider')
  return v.toast
}

// --- Modal ----------------------------------------------------
export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-lg' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 16 }}>
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// --- Spinner / loading ----------------------------------------
export function Loading({ label }: { label?: string }) {
  return (
    <div className="row gap-12" style={{ padding: 40, justifyContent: 'center', color: 'var(--text-dim)' }}>
      <div className="spinner" />
      {label && <span>{label}</span>}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="card"
      style={{
        borderColor: 'var(--red)',
        background: 'var(--red-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span style={{ color: 'var(--red)' }}>{message}</span>
      {onRetry && (
        <button className="btn btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

// --- Confirm dialog hook --------------------------------------
export function ConfirmModal({
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
  busy,
  onConfirm,
  onClose,
}: {
  title: string
  body: ReactNode
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="muted" style={{ marginBottom: 20, lineHeight: 1.6 }}>
        {body}
      </div>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
          {busy ? '…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
