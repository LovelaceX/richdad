/**
 * DangerZoneSection
 *
 * Settings section for clearing data, backup/restore, and factory reset.
 */

import React, { useState } from 'react'
import { AlertCircle, Download, Upload, Loader2 } from 'lucide-react'
import { useAlertStore } from '../../../stores/alertStore'
import { useToastStore } from '../../../stores/toastStore'
import { HelpTooltip } from '../../../components/common'
import {
  clearAPICache,
  clearAIHistory,
  clearPnLHistory,
  clearPriceAlerts,
  factoryReset,
} from '../../../lib/db'
import {
  createFullBackup,
  restoreFromBackup,
  downloadBackup,
  validateBackup,
  getBackupSummary,
  type BackupData,
} from '../../../lib/backup'

type ResetType = 'cache' | 'ai' | 'pnl' | 'alerts' | 'factory'

export function DangerZoneSection() {
  const { loadAlerts } = useAlertStore()
  const addToast = useToastStore((state) => state.addToast)

  // State
  const [showResetConfirm, setShowResetConfirm] = useState<ResetType | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  // Handle reset action
  const handleReset = async () => {
    if (!showResetConfirm) return

    setIsResetting(true)
    try {
      let successMessage = ''

      if (showResetConfirm === 'cache') {
        clearAPICache()
        successMessage = 'API cache cleared successfully'
      } else if (showResetConfirm === 'ai') {
        await clearAIHistory()
        successMessage = 'AI history cleared successfully'
      } else if (showResetConfirm === 'pnl') {
        await clearPnLHistory()
        successMessage = 'P&L history cleared successfully'
      } else if (showResetConfirm === 'alerts') {
        await clearPriceAlerts()
        loadAlerts()
        successMessage = 'Price alerts cleared successfully'
      } else if (showResetConfirm === 'factory') {
        await factoryReset()
        return // Page will reload
      }

      // Show success toast
      if (successMessage) {
        addToast({ message: successMessage, type: 'success' })
      }

      setShowResetConfirm(null)
    } catch (error) {
      console.error('Reset failed:', error)
      addToast({
        message: `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        helpSection: 'troubleshooting'
      })
    } finally {
      setIsResetting(false)
    }
  }

  // Handle backup creation
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true)
    try {
      const backup = await createFullBackup()
      downloadBackup(backup)
    } catch (error) {
      console.error('[DangerZone] Backup failed:', error)
      addToast({
        message: 'Failed to create backup',
        type: 'error',
        helpSection: 'troubleshooting'
      })
    } finally {
      setIsCreatingBackup(false)
    }
  }

  // Handle backup file import
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!validateBackup(data)) {
        addToast({
          message: 'Invalid backup file format',
          type: 'error',
          helpSection: 'troubleshooting'
        })
        return
      }

      setPendingBackup(data)
      setShowRestoreModal(true)
    } catch (error) {
      console.error('[DangerZone] Failed to read backup file:', error)
      addToast({
        message: 'Failed to read backup file. Please ensure it is a valid JSON file.',
        type: 'error',
        helpSection: 'troubleshooting'
      })
    }

    // Reset input
    e.target.value = ''
  }

  // Handle backup restore
  const handleRestoreBackup = async () => {
    if (!pendingBackup) return

    setIsRestoring(true)
    try {
      const result = await restoreFromBackup(pendingBackup)
      if (result.success) {
        addToast({
          message: 'Backup restored successfully! The page will reload.',
          type: 'success',
          duration: 2000
        })
        setTimeout(() => window.location.reload(), 1500)
      } else {
        addToast({
          message: `Restore failed: ${result.errors.join(', ')}`,
          type: 'error',
          helpSection: 'troubleshooting'
        })
      }
    } catch (error) {
      console.error('[DangerZone] Restore failed:', error)
      addToast({
        message: 'Failed to restore backup',
        type: 'error',
        helpSection: 'troubleshooting'
      })
    } finally {
      setIsRestoring(false)
      setShowRestoreModal(false)
      setPendingBackup(null)
    }
  }

  // Get confirmation modal content
  const getConfirmContent = () => {
    switch (showResetConfirm) {
      case 'cache':
        return {
          title: 'Clear API Budget Cache?',
          message:
            'This will reset your API call counters. Your API keys and settings will be preserved.',
          isDangerous: false,
        }
      case 'ai':
        return {
          title: 'Clear AI History?',
          message:
            'This will delete all trade decisions and AI recommendations. This action cannot be undone.',
          isDangerous: false,
        }
      case 'pnl':
        return {
          title: 'Clear P&L History?',
          message: 'This will delete all P&L tracking entries. This action cannot be undone.',
          isDangerous: false,
        }
      case 'alerts':
        return {
          title: 'Clear All Price Alerts?',
          message: 'This will delete all price alerts. This action cannot be undone.',
          isDangerous: false,
        }
      case 'factory':
        return {
          title: 'Factory Reset?',
          message:
            'This will delete ALL data including settings, profile, API keys, and history. The app will restart as if newly installed. This action CANNOT be undone.',
          isDangerous: true,
        }
      default:
        return { title: '', message: '', isDangerous: false }
    }
  }

  const confirmContent = getConfirmContent()

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-red-400 text-lg font-medium">Danger Zone</h2>
        <HelpTooltip content="Clear specific data or reset everything. Always create a backup before using these options." />
      </div>
      <p className="text-gray-500 text-sm mb-6">Clear cached data or reset the application</p>

      <div className="space-y-3">
        {/* Clear API Budget Cache */}
        <DangerAction
          title="Clear API Budget Cache"
          description="Reset API call counters"
          buttonText="Clear"
          onClick={() => setShowResetConfirm('cache')}
        />

        {/* Clear AI History */}
        <DangerAction
          title="Clear AI History"
          description="Delete trade decisions"
          buttonText="Clear"
          onClick={() => setShowResetConfirm('ai')}
        />

        {/* Clear PnL History */}
        <DangerAction
          title="Clear P&L History"
          description="Delete profit/loss entries"
          buttonText="Clear"
          onClick={() => setShowResetConfirm('pnl')}
        />

        {/* Clear Price Alerts */}
        <DangerAction
          title="Clear Price Alerts"
          description="Delete all alerts"
          buttonText="Clear"
          onClick={() => setShowResetConfirm('alerts')}
        />

        <div className="border-t border-terminal-border my-4" />

        {/* Factory Reset */}
        <div className="bg-red-900/10 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="text-red-400 text-sm font-medium">Factory Reset</span>
              <span className="text-gray-500 text-xs ml-3">Delete ALL data - cannot be undone</span>
            </div>
            <button
              onClick={() => setShowResetConfirm('factory')}
              className="px-4 py-1.5 bg-red-600/20 border border-red-600 text-red-500 rounded text-sm hover:bg-red-600/30 transition-colors whitespace-nowrap flex-shrink-0"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Backup & Restore Section */}
        <div className="border-t border-terminal-border my-4 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Download size={16} className="text-terminal-amber" />
            <h3 className="text-white font-medium">Backup & Restore</h3>
            <HelpTooltip content="Export all your settings, trades, and alerts to a JSON file. Restore anytime to recover your data." />
          </div>

          <div className="space-y-3">
            {/* Create Backup */}
            <div className="bg-terminal-panel border border-terminal-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="text-white text-sm font-medium">Create Full Backup</span>
                  <span className="text-gray-500 text-xs ml-3">
                    Export all settings, trades, holdings, and alerts
                  </span>
                </div>
                <button
                  onClick={handleCreateBackup}
                  disabled={isCreatingBackup}
                  className="flex items-center gap-2 px-4 py-1.5 bg-terminal-amber text-black rounded text-sm hover:bg-terminal-amber/90 transition-colors whitespace-nowrap flex-shrink-0 disabled:opacity-50"
                >
                  {isCreatingBackup ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      Export Backup
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Restore Backup */}
            <div className="bg-terminal-panel border border-terminal-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="text-white text-sm font-medium">Restore from Backup</span>
                  <span className="text-gray-500 text-xs ml-3">
                    Import a previously exported backup file
                  </span>
                </div>
                <label className="flex items-center gap-2 px-4 py-1.5 bg-terminal-border text-white rounded text-sm hover:bg-terminal-border/70 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer">
                  <Upload size={14} />
                  Import Backup
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportBackup}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Data Location Info */}
        <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4 mt-4">
          <h4 className="text-white text-sm font-medium mb-2">Data Storage Location</h4>
          <p className="text-gray-400 text-xs mb-2">RichDad stores data locally:</p>
          <div className="space-y-2 mb-3">
            <div>
              <span className="text-gray-500 text-xs">macOS:</span>
              <code className="block text-terminal-amber text-xs bg-terminal-panel px-2 py-1 rounded font-mono mt-1">
                ~/Library/Application Support/com.richdad.app/
              </code>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Windows:</span>
              <code className="block text-terminal-amber text-xs bg-terminal-panel px-2 py-1 rounded font-mono mt-1">
                %APPDATA%\com.richdad.app\
              </code>
            </div>
          </div>
          <p className="text-gray-500 text-xs">
            <strong>Note:</strong> Uninstalling the app does NOT remove this folder. To completely
            remove all data, delete this folder manually or use "Factory Reset" above.
          </p>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3
              className={`text-lg font-medium mb-2 ${
                confirmContent.isDangerous ? 'text-red-400' : 'text-white'
              }`}
            >
              {confirmContent.isDangerous && (
                <span className="inline-flex items-center gap-2">
                  <AlertCircle size={18} />
                  {confirmContent.title}
                </span>
              )}
              {!confirmContent.isDangerous && confirmContent.title}
            </h3>
            <p className="text-gray-400 text-sm mb-6">{confirmContent.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(null)}
                disabled={isResetting}
                className="flex-1 px-4 py-2 bg-terminal-border text-white rounded text-sm hover:bg-terminal-border/70 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className={`flex-1 px-4 py-2 rounded text-sm transition-colors disabled:opacity-50 ${
                  confirmContent.isDangerous
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-terminal-amber text-black hover:bg-amber-500'
                }`}
              >
                {isResetting
                  ? 'Processing...'
                  : confirmContent.isDangerous
                  ? 'Yes, Reset Everything'
                  : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Confirmation Modal */}
      {showRestoreModal && pendingBackup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-yellow-400 text-lg font-medium mb-2 flex items-center gap-2">
              <AlertCircle size={18} />
              Restore Backup?
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              This will replace ALL current data with the backup contents. This action cannot be
              undone.
            </p>

            {/* Backup Summary */}
            {(() => {
              const summary = getBackupSummary(pendingBackup)
              return (
                <div className="bg-terminal-bg rounded p-4 mb-4 text-sm">
                  <div className="grid grid-cols-2 gap-2 text-gray-400">
                    <div>Exported:</div>
                    <div className="text-white">{summary.exportedAt}</div>
                    <div>App Version:</div>
                    <div className="text-white">{summary.appVersion}</div>
                    <div>Trade Decisions:</div>
                    <div className="text-white">{summary.counts.tradeDecisions}</div>
                    <div>Holdings:</div>
                    <div className="text-white">{summary.counts.holdings}</div>
                    <div>Price Alerts:</div>
                    <div className="text-white">{summary.counts.priceAlerts}</div>
                    <div>RSS Feeds:</div>
                    <div className="text-white">{summary.counts.newsSources}</div>
                    <div>Watchlist:</div>
                    <div className="text-white">{summary.counts.watchlist}</div>
                  </div>
                </div>
              )
            })()}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRestoreModal(false)
                  setPendingBackup(null)
                }}
                disabled={isRestoring}
                className="flex-1 px-4 py-2 bg-terminal-border text-white rounded text-sm hover:bg-terminal-border/70 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreBackup}
                disabled={isRestoring}
                className="flex-1 px-4 py-2 bg-yellow-600 text-black rounded text-sm hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRestoring ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Restoring...
                  </>
                ) : (
                  'Restore Backup'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Danger action row component
 */
function DangerAction({
  title,
  description,
  buttonText,
  onClick,
}: {
  title: string
  description: string
  buttonText: string
  onClick: () => void
}) {
  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className="text-white text-sm font-medium">{title}</span>
          <span className="text-gray-500 text-xs ml-3">{description}</span>
        </div>
        <button
          onClick={onClick}
          className="px-4 py-1.5 bg-terminal-border text-white rounded text-sm hover:bg-terminal-border/70 transition-colors whitespace-nowrap flex-shrink-0"
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}
