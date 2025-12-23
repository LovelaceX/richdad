/**
 * Error Log Store
 *
 * Zustand store for managing error log state.
 * Provides paginated access to errors and resolution actions.
 */

import { create } from 'zustand'
import { db, type ErrorLogEntry } from '../lib/db'

const PAGE_SIZE = 5

interface ErrorLogState {
  errors: ErrorLogEntry[]
  loading: boolean
  currentPage: number
  totalPages: number
  totalErrors: number

  // Actions
  loadErrors: (page?: number) => Promise<void>
  resolveError: (id: number) => Promise<void>
  resolveAll: () => Promise<void>
  getUnresolvedCount: () => Promise<number>
  refresh: () => Promise<void>
}

export const useErrorLogStore = create<ErrorLogState>((set, get) => ({
  errors: [],
  loading: false,
  currentPage: 1,
  totalPages: 1,
  totalErrors: 0,

  loadErrors: async (page = 1) => {
    set({ loading: true })
    try {
      // Get total count of unresolved errors (0 = false in IndexedDB)
      const total = await db.errorLogs.where('resolved').equals(0).count()
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

      // Clamp page to valid range
      const validPage = Math.min(Math.max(1, page), totalPages)

      // Get paginated errors (newest first)
      // Note: Dexie's sortBy() is terminal, so we fetch all and sort in JS
      // IndexedDB stores booleans as 0/1 in indexes
      const allUnresolved = await db.errorLogs
        .where('resolved')
        .equals(0)
        .toArray()

      // Sort by timestamp descending (newest first)
      allUnresolved.sort((a, b) => b.timestamp - a.timestamp)

      // Manual pagination since Dexie compound queries are limited
      const startIdx = (validPage - 1) * PAGE_SIZE
      const errors = allUnresolved.slice(startIdx, startIdx + PAGE_SIZE)

      set({
        errors,
        currentPage: validPage,
        totalPages,
        totalErrors: total,
        loading: false
      })
    } catch (err) {
      console.error('[ErrorLog Store] Failed to load errors:', err)
      set({ loading: false, errors: [] })
    }
  },

  resolveError: async (id: number) => {
    try {
      await db.errorLogs.update(id, {
        resolved: true,
        resolvedAt: Date.now()
      })

      // Reload current page
      const { currentPage, loadErrors } = get()
      await loadErrors(currentPage)
    } catch (err) {
      console.error('[ErrorLog Store] Failed to resolve error:', err)
    }
  },

  resolveAll: async () => {
    try {
      // Get all unresolved error IDs (0 = false in IndexedDB)
      const unresolved = await db.errorLogs.where('resolved').equals(0).toArray()

      if (unresolved.length === 0) return

      // Update all to resolved
      const now = Date.now()
      await db.errorLogs.bulkUpdate(
        unresolved.map((e) => ({
          key: e.id!,
          changes: { resolved: true, resolvedAt: now }
        }))
      )

      // Reload first page
      await get().loadErrors(1)
    } catch (err) {
      console.error('[ErrorLog Store] Failed to resolve all:', err)
    }
  },

  getUnresolvedCount: async () => {
    try {
      // IndexedDB stores booleans as 0/1 in indexes
      return await db.errorLogs.where('resolved').equals(0).count()
    } catch (err) {
      console.error('[ErrorLog Store] Failed to get count:', err)
      return 0
    }
  },

  refresh: async () => {
    await get().loadErrors(get().currentPage)
  }
}))
