import { create } from 'zustand'
import { db, type ProTrader } from '../lib/db'

interface ProTraderState {
  traders: ProTrader[]
  loading: boolean
  loadTraders: () => Promise<void>
  addTrader: (trader: Omit<ProTrader, 'id'>) => Promise<void>
  removeTrader: (id: number) => Promise<void>
  toggleTrader: (id: number) => Promise<void>
  updateTrader: (id: number, updates: Partial<ProTrader>) => Promise<void>
  reorderTraders: (orderedIds: number[]) => Promise<void>
}

export const useProTraderStore = create<ProTraderState>((set, get) => ({
  traders: [],
  loading: false,

  loadTraders: async () => {
    set({ loading: true })
    try {
      const traders = await db.proTraders.toArray()
      // Sort by priority (lower = higher priority), undefined goes last
      traders.sort((a, b) => (a.priority || 99) - (b.priority || 99))
      set({ traders, loading: false })
    } catch (err) {
      console.error('Failed to load pro traders:', err)
      set({ loading: false })
    }
  },

  addTrader: async (trader) => {
    try {
      const id = await db.proTraders.add(trader as ProTrader)
      const newTrader = { ...trader, id }
      set(state => ({ traders: [...state.traders, newTrader as ProTrader] }))
    } catch (err) {
      console.error('Failed to add pro trader:', err)
    }
  },

  removeTrader: async (id) => {
    try {
      await db.proTraders.delete(id)
      set(state => ({ traders: state.traders.filter(t => t.id !== id) }))
    } catch (err) {
      console.error('Failed to remove pro trader:', err)
    }
  },

  toggleTrader: async (id) => {
    try {
      const trader = get().traders.find(t => t.id === id)
      if (trader) {
        await db.proTraders.update(id, { enabled: !trader.enabled })
        set(state => ({
          traders: state.traders.map(t =>
            t.id === id ? { ...t, enabled: !t.enabled } : t
          )
        }))
      }
    } catch (err) {
      console.error('Failed to toggle pro trader:', err)
    }
  },

  updateTrader: async (id, updates) => {
    try {
      await db.proTraders.update(id, updates)
      set(state => ({
        traders: state.traders.map(t =>
          t.id === id ? { ...t, ...updates } : t
        )
      }))
    } catch (err) {
      console.error('Failed to update pro trader:', err)
    }
  },

  reorderTraders: async (orderedIds) => {
    try {
      // Update priorities in DB based on new order
      for (let i = 0; i < orderedIds.length; i++) {
        await db.proTraders.update(orderedIds[i], { priority: i + 1 })
      }

      // Update local state with new priorities
      set(state => ({
        traders: state.traders
          .map(t => ({
            ...t,
            priority: orderedIds.indexOf(t.id!) + 1
          }))
          .sort((a, b) => (a.priority || 99) - (b.priority || 99))
      }))
    } catch (err) {
      console.error('Failed to reorder traders:', err)
    }
  },
}))
