import { useEffect } from 'react'
import { X, AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useToastStore, type Toast } from '../../stores/toastStore'

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((state) => state.removeToast)

  const icons = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
    success: CheckCircle
  }

  const colors = {
    info: 'border-blue-500 bg-blue-500/10',
    warning: 'border-yellow-500 bg-yellow-500/10',
    error: 'border-red-500 bg-red-500/10',
    success: 'border-terminal-up bg-terminal-up/10'
  }

  const iconColors = {
    info: 'text-blue-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    success: 'text-terminal-up'
  }

  const Icon = icons[toast.type]

  return (
    <div
      className={`
        flex items-start gap-3 p-3 rounded-lg border backdrop-blur-sm
        ${colors[toast.type]}
        animate-slide-in
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon size={18} className={iconColors[toast.type]} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {toast.provider && (
          <span className="text-xs text-gray-400 font-medium">
            {toast.provider}
          </span>
        )}
        <p className="text-sm text-white">{toast.message}</p>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-gray-400 hover:text-white transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)
  const addToast = useToastStore((state) => state.addToast)

  // Listen for API limit reached events
  useEffect(() => {
    const handleApiLimitReached = (event: CustomEvent) => {
      const { provider, message } = event.detail
      addToast({
        message,
        type: 'warning',
        provider,
        duration: 6000
      })
    }

    window.addEventListener('api-limit-reached', handleApiLimitReached as EventListener)
    return () => {
      window.removeEventListener('api-limit-reached', handleApiLimitReached as EventListener)
    }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
