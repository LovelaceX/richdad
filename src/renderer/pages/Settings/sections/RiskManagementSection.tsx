/**
 * RiskManagementSection
 *
 * Settings section for trading limits and risk parameters.
 */

import React, { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import type { UserSettings } from '../../../lib/db'

interface RiskManagementSectionProps {
  settings: UserSettings
  onSave: (updates: Partial<UserSettings>) => Promise<void>
}

export function RiskManagementSection({ settings, onSave }: RiskManagementSectionProps) {
  // Local state for budget editing
  const [editingBudget, setEditingBudget] = useState('')
  const [isEditingBudget, setIsEditingBudget] = useState(false)

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US')
  }

  const handleBudgetFocus = () => {
    setIsEditingBudget(true)
    setEditingBudget(String(settings.dailyBudget || 1000))
  }

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setEditingBudget(raw)
  }

  const handleBudgetBlur = () => {
    const value = parseInt(editingBudget, 10) || 1000
    onSave({ dailyBudget: value })
    setIsEditingBudget(false)
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Risk Management</h2>
      <p className="text-gray-500 text-sm mb-6">Set your trading limits and risk parameters</p>

      <div className="space-y-6">
        {/* Daily Budget */}
        <div>
          <label className="text-white text-sm mb-3 block">Daily Budget</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="text"
              value={isEditingBudget ? editingBudget : formatCurrency(settings.dailyBudget || 1000)}
              onFocus={handleBudgetFocus}
              onChange={handleBudgetChange}
              onBlur={handleBudgetBlur}
              placeholder="1000"
              className="w-full bg-terminal-bg border border-terminal-border rounded pl-7 pr-3 py-2 text-white font-mono"
            />
          </div>
          <p className="text-gray-600 text-xs mt-2">Maximum amount to risk per day</p>
        </div>

        {/* Daily Loss Limit */}
        <div>
          <label className="text-white text-sm mb-3 block">Daily Loss Limit</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="20"
              value={settings.dailyLossLimit}
              onChange={(e) => onSave({ dailyLossLimit: Number(e.target.value) })}
              className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
            />
            <span className="text-terminal-amber font-mono w-12 text-right">{settings.dailyLossLimit}%</span>
          </div>
          <p className="text-gray-600 text-xs mt-2">
            Maximum loss: ${formatCurrency(Math.round((settings.dailyBudget || 1000) * settings.dailyLossLimit / 100))}
            {settings.dailyLossLimit > 10 && (
              <span className="text-orange-500 ml-2 inline-flex items-center gap-1">
                <AlertCircle size={12} /> Most traders use 2-5%
              </span>
            )}
          </p>
        </div>

        {/* Position Size Limit */}
        <div>
          <label className="text-white text-sm mb-3 block">Position Size Limit</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="25"
              value={settings.positionSizeLimit}
              onChange={(e) => onSave({ positionSizeLimit: Number(e.target.value) })}
              className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
            />
            <span className="text-terminal-amber font-mono w-12 text-right">{settings.positionSizeLimit}%</span>
          </div>
          <p className="text-gray-600 text-xs mt-2">Maximum portfolio allocation per position</p>
        </div>

        {/* Pattern Lookback Period */}
        <div>
          <label className="text-white text-sm mb-3 block">Pattern Lookback Period</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="90"
              max="365"
              step="1"
              value={settings.lookbackDays}
              onChange={(e) => onSave({ lookbackDays: Number(e.target.value) })}
              className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
            />
            <span className="text-terminal-amber font-mono w-20 text-right">{settings.lookbackDays} days</span>
          </div>
          <p className="text-gray-600 text-xs mt-2">How far back AI analyzes historical patterns</p>
        </div>
      </div>
    </div>
  )
}
