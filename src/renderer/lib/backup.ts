/**
 * Full Backup/Restore Service for RichDad
 * Exports and imports all Dexie tables + localStorage settings
 */

import {
  db,
  getSettings,
  getAISettings,
  getProfile,
  getHoldings,
  type UserSettings,
  type AISettings,
  type UserProfile,
  type TradeDecision,
  type Holding,
  type PriceAlert,
  type ProTrader,
  type NewsSource,
  type PnLEntry,
  type WatchlistEntry
} from './db'

export interface BackupData {
  version: string
  exportedAt: string
  appVersion: string
  data: {
    userSettings: UserSettings | null
    aiSettings: AISettings | null
    userProfile: UserProfile | null
    tradeDecisions: TradeDecision[]
    holdings: Holding[]
    priceAlerts: PriceAlert[]
    proTraders: ProTrader[]
    newsSources: NewsSource[]
    pnlEntries: PnLEntry[]
    watchlist: WatchlistEntry[]
  }
  localStorage: {
    'richdad-settings'?: string
    'richdad_api_budget'?: string
    'richdad_ai_budget'?: string
  }
}

const BACKUP_VERSION = '1.0'
const APP_VERSION = '4.1.0'

/**
 * Create a full backup of all data
 */
export async function createFullBackup(): Promise<BackupData> {
  console.log('[Backup] Creating full backup...')

  // Fetch all data from Dexie tables
  const [
    userSettings,
    aiSettings,
    userProfile,
    tradeDecisions,
    holdings,
    priceAlerts,
    proTraders,
    newsSources,
    pnlEntries,
    watchlist
  ] = await Promise.all([
    getSettings(),
    getAISettings(),
    getProfile(),
    db.tradeDecisions.toArray(),
    getHoldings(),
    db.priceAlerts.toArray(),
    db.proTraders.toArray(),
    db.newsSources.toArray(),
    db.pnlEntries.toArray(),
    db.watchlist.toArray()
  ])

  // Get localStorage items
  const localStorageData: BackupData['localStorage'] = {}
  const localStorageKeys = ['richdad-settings', 'richdad_api_budget', 'richdad_ai_budget']
  for (const key of localStorageKeys) {
    const value = localStorage.getItem(key)
    if (value) {
      localStorageData[key as keyof BackupData['localStorage']] = value
    }
  }

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: {
      userSettings,
      aiSettings,
      userProfile,
      tradeDecisions,
      holdings,
      priceAlerts,
      proTraders,
      newsSources,
      pnlEntries,
      watchlist
    },
    localStorage: localStorageData
  }

  console.log('[Backup] Backup created:', {
    tradeDecisions: tradeDecisions.length,
    holdings: holdings.length,
    priceAlerts: priceAlerts.length,
    proTraders: proTraders.length,
    newsSources: newsSources.length,
    pnlEntries: pnlEntries.length,
    watchlist: watchlist.length
  })

  return backup
}

/**
 * Validate backup data structure
 */
export function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false

  const backup = data as Record<string, unknown>

  // Check required fields
  if (typeof backup.version !== 'string') return false
  if (typeof backup.exportedAt !== 'string') return false
  if (!backup.data || typeof backup.data !== 'object') return false

  const backupData = backup.data as Record<string, unknown>

  // Check data arrays exist (they can be empty)
  if (!Array.isArray(backupData.tradeDecisions)) return false
  if (!Array.isArray(backupData.holdings)) return false
  if (!Array.isArray(backupData.priceAlerts)) return false
  if (!Array.isArray(backupData.proTraders)) return false
  if (!Array.isArray(backupData.newsSources)) return false
  if (!Array.isArray(backupData.pnlEntries)) return false
  if (!Array.isArray(backupData.watchlist)) return false

  return true
}

/**
 * Restore from a backup file
 * WARNING: This replaces ALL current data
 */
export async function restoreFromBackup(backup: BackupData): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = []

  console.log('[Backup] Starting restore from backup dated:', backup.exportedAt)

  try {
    // Clear all existing data first
    await db.transaction('rw', [
      db.tradeDecisions,
      db.userSettings,
      db.aiSettings,
      db.userProfile,
      db.holdings,
      db.priceAlerts,
      db.proTraders,
      db.newsSources,
      db.pnlEntries,
      db.watchlist
    ], async () => {
      await db.tradeDecisions.clear()
      await db.userSettings.clear()
      await db.aiSettings.clear()
      await db.userProfile.clear()
      await db.holdings.clear()
      await db.priceAlerts.clear()
      await db.proTraders.clear()
      await db.newsSources.clear()
      await db.pnlEntries.clear()
      await db.watchlist.clear()
    })

    // Restore settings (single records)
    if (backup.data.userSettings) {
      // Remove id so Dexie generates a new one
      const { id, ...settingsData } = backup.data.userSettings
      await db.userSettings.add(settingsData as UserSettings)
    }

    if (backup.data.aiSettings) {
      const { id, ...aiData } = backup.data.aiSettings
      await db.aiSettings.add(aiData as AISettings)
    }

    if (backup.data.userProfile) {
      const { id, ...profileData } = backup.data.userProfile
      await db.userProfile.add(profileData as UserProfile)
    }

    // Restore arrays (bulk add, stripping IDs)
    if (backup.data.tradeDecisions.length > 0) {
      const trades = backup.data.tradeDecisions.map(({ id, ...rest }) => rest)
      await db.tradeDecisions.bulkAdd(trades as TradeDecision[])
    }

    if (backup.data.holdings.length > 0) {
      const holdings = backup.data.holdings.map(({ id, ...rest }) => rest)
      await db.holdings.bulkAdd(holdings as Holding[])
    }

    if (backup.data.priceAlerts.length > 0) {
      const alerts = backup.data.priceAlerts.map(({ id, ...rest }) => rest)
      await db.priceAlerts.bulkAdd(alerts as PriceAlert[])
    }

    if (backup.data.proTraders.length > 0) {
      const traders = backup.data.proTraders.map(({ id, ...rest }) => rest)
      await db.proTraders.bulkAdd(traders as ProTrader[])
    }

    if (backup.data.newsSources.length > 0) {
      const sources = backup.data.newsSources.map(({ id, ...rest }) => rest)
      await db.newsSources.bulkAdd(sources as NewsSource[])
    }

    if (backup.data.pnlEntries.length > 0) {
      const entries = backup.data.pnlEntries.map(({ id, ...rest }) => rest)
      await db.pnlEntries.bulkAdd(entries as PnLEntry[])
    }

    if (backup.data.watchlist.length > 0) {
      const watchlist = backup.data.watchlist.map(({ id, ...rest }) => rest)
      await db.watchlist.bulkAdd(watchlist as WatchlistEntry[])
    }

    // Restore localStorage
    if (backup.localStorage) {
      Object.entries(backup.localStorage).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value)
        }
      })
    }

    console.log('[Backup] Restore completed successfully')

    return { success: true, errors }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Restore failed: ${message}`)
    console.error('[Backup] Restore failed:', error)
    return { success: false, errors }
  }
}

/**
 * Download backup as JSON file
 */
export function downloadBackup(backup: BackupData, filename?: string): void {
  const date = new Date().toISOString().split('T')[0]
  const defaultFilename = `richdad-backup-${date}.json`

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename || defaultFilename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  console.log('[Backup] Downloaded:', filename || defaultFilename)
}

/**
 * Get backup summary for display
 */
export function getBackupSummary(backup: BackupData) {
  return {
    exportedAt: new Date(backup.exportedAt).toLocaleString(),
    appVersion: backup.appVersion || 'Unknown',
    counts: {
      tradeDecisions: backup.data.tradeDecisions.length,
      holdings: backup.data.holdings.length,
      priceAlerts: backup.data.priceAlerts.length,
      proTraders: backup.data.proTraders.length,
      newsSources: backup.data.newsSources.length,
      pnlEntries: backup.data.pnlEntries.length,
      watchlist: backup.data.watchlist.length
    }
  }
}
