/**
 * useStockAutocomplete Hook
 *
 * Provides stock symbol autocomplete functionality with keyboard navigation.
 * Used by Price Alerts and Portfolio Holdings sections.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { searchStocks, type StockInfo } from '../../../lib/stockSymbols'

export interface UseStockAutocompleteOptions {
  /** Initial value for the input */
  initialValue?: string
  /** Callback when a stock is selected */
  onSelect?: (symbol: string, stock?: StockInfo) => void
  /** Maximum results to show (default: 10) */
  maxResults?: number
  /** Minimum characters before search (default: 1) */
  minChars?: number
}

export interface UseStockAutocompleteReturn {
  /** Current input value */
  inputValue: string
  /** Set the input value directly */
  setInputValue: (value: string) => void
  /** Search results matching the input */
  searchResults: StockInfo[]
  /** Currently selected index in dropdown (-1 if none) */
  selectedIndex: number
  /** Whether the dropdown should be visible */
  isOpen: boolean
  /** Handle input change event */
  handleInputChange: (value: string) => void
  /** Handle keyboard navigation */
  handleKeyDown: (e: React.KeyboardEvent) => void
  /** Handle selection of a stock */
  handleSelect: (stock: StockInfo) => void
  /** Clear results and close dropdown */
  clearResults: () => void
  /** Reset the entire state */
  reset: () => void
}

/**
 * Hook for stock symbol autocomplete with keyboard navigation
 */
export function useStockAutocomplete({
  initialValue = '',
  onSelect,
  maxResults = 10,
  minChars = 1,
}: UseStockAutocompleteOptions = {}): UseStockAutocompleteReturn {
  const [inputValue, setInputValue] = useState(initialValue)
  const [searchResults, setSearchResults] = useState<StockInfo[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)

  // Track if we should skip the next search (after selection)
  const skipNextSearch = useRef(false)

  // Search when input changes
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false
      return
    }

    if (inputValue.length >= minChars) {
      const results = searchStocks(inputValue).slice(0, maxResults)
      setSearchResults(results)
      setSelectedIndex(-1)
      setIsOpen(results.length > 0)
    } else {
      setSearchResults([])
      setSelectedIndex(-1)
      setIsOpen(false)
    }
  }, [inputValue, maxResults, minChars])

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        )
        break

      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
        break

      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          const selected = searchResults[selectedIndex]
          skipNextSearch.current = true
          setInputValue(selected.symbol)
          setSearchResults([])
          setSelectedIndex(-1)
          setIsOpen(false)
          onSelect?.(selected.symbol, selected)
        } else if (inputValue.trim()) {
          // Select the typed value if no dropdown selection
          setSearchResults([])
          setSelectedIndex(-1)
          setIsOpen(false)
          onSelect?.(inputValue.toUpperCase())
        }
        break

      case 'Escape':
        setSearchResults([])
        setSelectedIndex(-1)
        setIsOpen(false)
        break

      case 'Tab':
        // Allow tab to proceed but close dropdown
        setSearchResults([])
        setSelectedIndex(-1)
        setIsOpen(false)
        break
    }
  }, [isOpen, searchResults, selectedIndex, inputValue, onSelect])

  // Handle click selection
  const handleSelect = useCallback((stock: StockInfo) => {
    skipNextSearch.current = true
    setInputValue(stock.symbol)
    setSearchResults([])
    setSelectedIndex(-1)
    setIsOpen(false)
    onSelect?.(stock.symbol, stock)
  }, [onSelect])

  // Clear results
  const clearResults = useCallback(() => {
    setSearchResults([])
    setSelectedIndex(-1)
    setIsOpen(false)
  }, [])

  // Reset entire state
  const reset = useCallback(() => {
    setInputValue(initialValue)
    setSearchResults([])
    setSelectedIndex(-1)
    setIsOpen(false)
  }, [initialValue])

  return {
    inputValue,
    setInputValue,
    searchResults,
    selectedIndex,
    isOpen,
    handleInputChange,
    handleKeyDown,
    handleSelect,
    clearResults,
    reset,
  }
}
