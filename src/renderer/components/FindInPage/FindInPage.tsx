/**
 * FindInPage - Browser-style Ctrl+F find functionality
 *
 * Uses native browser find API when available, falls back to custom highlighting.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'

interface FindInPageProps {
  isOpen: boolean
  onClose: () => void
}

export function FindInPage({ isOpen, onClose }: FindInPageProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatch, setCurrentMatch] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const highlightsRef = useRef<Range[]>([])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isOpen])

  // Clear highlights when closed
  useEffect(() => {
    if (!isOpen) {
      clearHighlights()
      setSearchTerm('')
      setMatchCount(0)
      setCurrentMatch(0)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
      // Enter to go to next match
      if (e.key === 'Enter' && isOpen) {
        if (e.shiftKey) {
          goToPrevMatch()
        } else {
          goToNextMatch()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, currentMatch, matchCount])

  const clearHighlights = useCallback(() => {
    // Remove all highlight marks
    const marks = document.querySelectorAll('mark.find-highlight')
    marks.forEach(mark => {
      const parent = mark.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark)
        parent.normalize()
      }
    })
    highlightsRef.current = []
  }, [])

  const performSearch = useCallback((term: string) => {
    clearHighlights()

    if (!term || term.length < 1) {
      setMatchCount(0)
      setCurrentMatch(0)
      return
    }

    const searchRegex = new RegExp(escapeRegExp(term), 'gi')
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip hidden elements, scripts, styles, and the find input itself
          const parent = node.parentElement
          if (!parent) return NodeFilter.FILTER_REJECT
          if (parent.closest('.find-in-page-container')) return NodeFilter.FILTER_REJECT
          if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return NodeFilter.FILTER_REJECT
          if (parent.closest('[hidden]')) return NodeFilter.FILTER_REJECT
          const style = window.getComputedStyle(parent)
          if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT
          return NodeFilter.FILTER_ACCEPT
        }
      }
    )

    const matches: { node: Text; start: number; end: number }[] = []
    let node: Node | null

    while ((node = walker.nextNode())) {
      const textNode = node as Text
      const text = textNode.textContent || ''
      let match: RegExpExecArray | null

      searchRegex.lastIndex = 0
      while ((match = searchRegex.exec(text)) !== null) {
        matches.push({
          node: textNode,
          start: match.index,
          end: match.index + match[0].length
        })
      }
    }

    // Apply highlights in reverse order to avoid index shifting
    const sortedMatches = [...matches].sort((a, b) => {
      if (a.node === b.node) return b.start - a.start
      return 0
    })

    // Group matches by node
    const matchesByNode = new Map<Text, { start: number; end: number }[]>()
    for (const match of sortedMatches) {
      const nodeMatches = matchesByNode.get(match.node) || []
      nodeMatches.push({ start: match.start, end: match.end })
      matchesByNode.set(match.node, nodeMatches)
    }

    // Apply highlights
    matchesByNode.forEach((nodeMatches, textNode) => {
      // Sort matches in reverse order for this node
      nodeMatches.sort((a, b) => b.start - a.start)

      let currentNode: Text = textNode
      for (const { start, end } of nodeMatches) {
        try {
          const range = document.createRange()
          range.setStart(currentNode, start)
          range.setEnd(currentNode, end)

          const mark = document.createElement('mark')
          mark.className = 'find-highlight'
          mark.style.cssText = 'background-color: #fbbf24; color: black; padding: 0 1px; border-radius: 2px;'

          range.surroundContents(mark)

          // Update reference if we're splitting the same node multiple times
          if (mark.previousSibling?.nodeType === Node.TEXT_NODE) {
            currentNode = mark.previousSibling as Text
          }
        } catch {
          // Range may fail if it crosses element boundaries
        }
      }
    })

    const totalMatches = matches.length
    setMatchCount(totalMatches)
    setCurrentMatch(totalMatches > 0 ? 1 : 0)

    // Scroll to first match
    if (totalMatches > 0) {
      scrollToMatch(1)
    }
  }, [clearHighlights])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchTerm)
    }, 150)
    return () => clearTimeout(timer)
  }, [searchTerm, performSearch])

  const scrollToMatch = (matchIndex: number) => {
    const marks = document.querySelectorAll('mark.find-highlight')
    if (marks.length === 0 || matchIndex < 1 || matchIndex > marks.length) return

    // Reset all highlights
    marks.forEach((mark, i) => {
      if (i === matchIndex - 1) {
        ;(mark as HTMLElement).style.backgroundColor = '#f97316' // Orange for current
        ;(mark as HTMLElement).style.outline = '2px solid #ea580c'
      } else {
        ;(mark as HTMLElement).style.backgroundColor = '#fbbf24' // Yellow for others
        ;(mark as HTMLElement).style.outline = 'none'
      }
    })

    // Scroll to current match
    const currentMark = marks[matchIndex - 1]
    currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const goToNextMatch = () => {
    if (matchCount === 0) return
    const next = currentMatch >= matchCount ? 1 : currentMatch + 1
    setCurrentMatch(next)
    scrollToMatch(next)
  }

  const goToPrevMatch = () => {
    if (matchCount === 0) return
    const prev = currentMatch <= 1 ? matchCount : currentMatch - 1
    setCurrentMatch(prev)
    scrollToMatch(prev)
  }

  if (!isOpen) return null

  return (
    <div className="find-in-page-container fixed top-16 right-4 z-[200] bg-terminal-panel border border-terminal-border rounded-lg shadow-xl p-2 flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Find in page..."
        className="w-48 bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-terminal-amber"
      />

      <span className="text-gray-500 text-xs min-w-[60px] text-center">
        {matchCount > 0 ? `${currentMatch}/${matchCount}` : 'No matches'}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={goToPrevMatch}
          disabled={matchCount === 0}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-terminal-border/50"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={goToNextMatch}
          disabled={matchCount === 0}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-terminal-border/50"
          title="Next match (Enter)"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <button
        onClick={onClose}
        className="p-1 text-gray-400 hover:text-white rounded hover:bg-terminal-border/50"
        title="Close (Esc)"
      >
        <X size={16} />
      </button>
    </div>
  )
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
