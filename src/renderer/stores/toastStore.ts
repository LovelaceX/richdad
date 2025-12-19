import { create } from 'zustand'
import type { HelpSection } from './helpStore'

export interface Toast {
  id: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  provider?: string
  duration?: number
  helpSection?: HelpSection  // Optional link to help section
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast = { ...toast, id }

    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast] // Keep max 5 toasts
    }))

    // Auto-remove after duration (default 5 seconds)
    const duration = toast.duration ?? 5000
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }))
    }, duration)
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  },

  clearAll: () => {
    set({ toasts: [] })
  }
}))
