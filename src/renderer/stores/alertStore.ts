import { create } from 'zustand'
import { db, type PriceAlert } from '../lib/db'

interface AlertState {
  alerts: PriceAlert[]
  loading: boolean
  loadAlerts: () => Promise<void>
  addAlert: (alert: Omit<PriceAlert, 'id' | 'triggered' | 'createdAt'>) => Promise<void>
  removeAlert: (id: number) => Promise<void>
  triggerAlert: (id: number) => Promise<void>
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  loading: false,

  loadAlerts: async () => {
    set({ loading: true })
    try {
      const alerts = await db.priceAlerts.toArray()
      set({ alerts, loading: false })
    } catch (err) {
      console.error('Failed to load alerts:', err)
      set({ loading: false })
    }
  },

  addAlert: async (alert) => {
    try {
      const newAlert: PriceAlert = {
        ...alert,
        triggered: false,
        createdAt: Date.now(),
      }
      const id = await db.priceAlerts.add(newAlert)
      set(state => ({ alerts: [...state.alerts, { ...newAlert, id }] }))
    } catch (err) {
      console.error('Failed to add alert:', err)
    }
  },

  removeAlert: async (id) => {
    try {
      await db.priceAlerts.delete(id)
      set(state => ({ alerts: state.alerts.filter(a => a.id !== id) }))
    } catch (err) {
      console.error('Failed to remove alert:', err)
    }
  },

  triggerAlert: async (id) => {
    try {
      await db.priceAlerts.update(id, { triggered: true })
      set(state => ({
        alerts: state.alerts.map(a =>
          a.id === id ? { ...a, triggered: true } : a
        )
      }))
    } catch (err) {
      console.error('Failed to trigger alert:', err)
    }
  },
}))
