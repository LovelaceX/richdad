/**
 * usePortfolioHoldings Hook
 *
 * Encapsulates all portfolio holdings state and CRUD operations.
 * Includes modal management, form state, and autocomplete.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  getHoldings,
  addHolding,
  updateHolding,
  deleteHolding,
  type Holding,
} from '../../../lib/db'
import { useStockAutocomplete } from './useStockAutocomplete'

export interface HoldingForm {
  symbol: string
  shares: string
  avgCostBasis: string
  notes: string
}

const INITIAL_FORM: HoldingForm = {
  symbol: '',
  shares: '',
  avgCostBasis: '',
  notes: '',
}

export interface UsePortfolioHoldingsReturn {
  /** All holdings */
  holdings: Holding[]
  /** Whether holdings are being loaded */
  isLoading: boolean
  /** Whether the add/edit modal is visible */
  showModal: boolean
  /** The holding being edited (null if adding new) */
  editingHolding: Holding | null
  /** Current form state */
  form: HoldingForm
  /** Computed totals */
  totals: {
    totalCost: number
    totalShares: number
    positionCount: number
  }
  /** Stock autocomplete for symbol input */
  symbolAutocomplete: ReturnType<typeof useStockAutocomplete>

  // Actions
  /** Load/refresh holdings from database */
  loadHoldings: () => Promise<void>
  /** Open modal to add new holding */
  openAddModal: () => void
  /** Open modal to edit existing holding */
  openEditModal: (holding: Holding) => void
  /** Close the modal */
  closeModal: () => void
  /** Update a form field */
  updateFormField: <K extends keyof HoldingForm>(field: K, value: HoldingForm[K]) => void
  /** Save the current form (add or update) */
  saveHolding: () => Promise<{ success: boolean; error?: string }>
  /** Delete a holding by ID */
  removeHolding: (id: number) => Promise<void>
}

/**
 * Hook to manage portfolio holdings state and operations
 */
export function usePortfolioHoldings(): UsePortfolioHoldingsReturn {
  // State
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)
  const [form, setForm] = useState<HoldingForm>(INITIAL_FORM)

  // Symbol autocomplete
  const symbolAutocomplete = useStockAutocomplete({
    maxResults: 5,
    onSelect: (symbol) => {
      setForm(prev => ({ ...prev, symbol }))
    },
  })

  // Load holdings on mount
  useEffect(() => {
    loadHoldings()
  }, [])

  // Load holdings from database
  const loadHoldings = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getHoldings()
      setHoldings(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Compute totals
  const totals = {
    totalCost: holdings.reduce((sum, h) => sum + h.totalCost, 0),
    totalShares: holdings.reduce((sum, h) => sum + h.shares, 0),
    positionCount: holdings.length,
  }

  // Open modal to add new holding
  const openAddModal = useCallback(() => {
    setEditingHolding(null)
    setForm(INITIAL_FORM)
    symbolAutocomplete.reset()
    setShowModal(true)
  }, [symbolAutocomplete])

  // Open modal to edit existing holding
  const openEditModal = useCallback((holding: Holding) => {
    setEditingHolding(holding)
    setForm({
      symbol: holding.symbol,
      shares: holding.shares.toString(),
      avgCostBasis: holding.avgCostBasis.toString(),
      notes: holding.notes || '',
    })
    symbolAutocomplete.setInputValue(holding.symbol)
    symbolAutocomplete.clearResults()
    setShowModal(true)
  }, [symbolAutocomplete])

  // Close modal
  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingHolding(null)
    symbolAutocomplete.clearResults()
  }, [symbolAutocomplete])

  // Update form field
  const updateFormField = useCallback(<K extends keyof HoldingForm>(
    field: K,
    value: HoldingForm[K]
  ) => {
    setForm(prev => ({ ...prev, [field]: value }))

    // Sync symbol field with autocomplete
    if (field === 'symbol') {
      symbolAutocomplete.handleInputChange(value as string)
    }
  }, [symbolAutocomplete])

  // Save holding (add or update)
  const saveHolding = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const shares = parseFloat(form.shares)
    const avgCost = parseFloat(form.avgCostBasis)

    // Validation
    if (!form.symbol) {
      return { success: false, error: 'Symbol is required' }
    }
    if (isNaN(shares) || shares <= 0) {
      return { success: false, error: 'Shares must be a positive number' }
    }
    if (isNaN(avgCost) || avgCost <= 0) {
      return { success: false, error: 'Average cost must be a positive number' }
    }

    try {
      if (editingHolding && editingHolding.id) {
        // Update existing
        await updateHolding(editingHolding.id, {
          shares,
          avgCostBasis: avgCost,
          totalCost: shares * avgCost,
          notes: form.notes || undefined,
          lastUpdated: Date.now(),
        })
      } else {
        // Add new
        await addHolding({
          symbol: form.symbol.toUpperCase(),
          shares,
          avgCostBasis: avgCost,
          totalCost: shares * avgCost,
          entryDate: Date.now(),
          lastUpdated: Date.now(),
          notes: form.notes || undefined,
        })
      }

      // Refresh and close
      await loadHoldings()
      closeModal()
      return { success: true }
    } catch (error) {
      console.error('[usePortfolioHoldings] Save error:', error)
      return { success: false, error: 'Failed to save holding' }
    }
  }, [form, editingHolding, loadHoldings, closeModal])

  // Delete holding
  const removeHolding = useCallback(async (id: number) => {
    await deleteHolding(id)
    await loadHoldings()
  }, [loadHoldings])

  return {
    holdings,
    isLoading,
    showModal,
    editingHolding,
    form,
    totals,
    symbolAutocomplete,
    loadHoldings,
    openAddModal,
    openEditModal,
    closeModal,
    updateFormField,
    saveHolding,
    removeHolding,
  }
}
