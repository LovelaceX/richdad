/**
 * Morning Briefing Button
 * Triggers batch analysis for all watchlist tickers
 */

import { useState } from 'react'
import { Sun, Loader2 } from 'lucide-react'
import { useMarketStore } from '../../stores/marketStore'
import { useAIStore } from '../../stores/aiStore'
import { useToastStore } from '../../stores/toastStore'
import { generateMorningBriefing, estimateBriefingDuration } from '../../../services/morningBriefingService'
import { formatApiError } from '../../../services/marketData'
import { BriefingModal } from './BriefingModal'

export function MorningBriefingButton() {
  const [showModal, setShowModal] = useState(false)

  // Get state from stores
  const watchlist = useMarketStore(state => state.watchlist)
  const isBriefingRunning = useAIStore(state => state.isBriefingRunning)
  const briefingProgress = useAIStore(state => state.briefingProgress)
  const morningBriefing = useAIStore(state => state.morningBriefing)
  const setBriefingRunning = useAIStore(state => state.setBriefingRunning)
  const setBriefingProgress = useAIStore(state => state.setBriefingProgress)
  const setMorningBriefing = useAIStore(state => state.setMorningBriefing)
  const addToast = useToastStore(state => state.addToast)

  const handleGenerateBriefing = async () => {
    if (isBriefingRunning) return

    const symbols = watchlist.map(item => item.symbol)
    if (symbols.length === 0) {
      console.warn('[MorningBriefing] No symbols in watchlist')
      return
    }

    setBriefingRunning(true)
    setBriefingProgress({ current: 0, total: symbols.length, ticker: '' })

    try {
      const briefing = await generateMorningBriefing(
        symbols,
        (current, total, ticker) => {
          setBriefingProgress({ current, total, ticker })
        }
      )

      setMorningBriefing(briefing)
      setShowModal(true)
    } catch (error) {
      console.error('[MorningBriefing] Generation failed:', error)
      // Show user-friendly error toast
      const errorMessage = formatApiError(error, 'AI')
      addToast({
        type: 'error',
        message: errorMessage,
        helpSection: 'ai-copilot'
      })
    } finally {
      setBriefingRunning(false)
      setBriefingProgress(null)
    }
  }

  const estimatedTime = estimateBriefingDuration(watchlist.length)
  const estimatedMinutes = Math.ceil(estimatedTime / 60)

  return (
    <>
      <button
        onClick={handleGenerateBriefing}
        disabled={isBriefingRunning || watchlist.length === 0}
        className={`
          w-full flex items-center justify-center gap-2 px-3 py-2 rounded
          text-xs font-medium transition-all
          ${isBriefingRunning
            ? 'bg-terminal-amber/20 text-terminal-amber cursor-wait'
            : 'bg-terminal-amber/10 text-terminal-amber hover:bg-terminal-amber/20'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title={`Analyze ${watchlist.length} symbols (~${estimatedMinutes} min)`}
      >
        {isBriefingRunning ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>
              Analyzing {briefingProgress?.ticker || '...'} ({briefingProgress?.current || 0}/{briefingProgress?.total || watchlist.length})
            </span>
          </>
        ) : (
          <>
            <Sun size={14} />
            <span>Morning Briefing</span>
            <span className="text-[10px] text-terminal-text/50">
              ({watchlist.length})
            </span>
          </>
        )}
      </button>

      {/* Results Modal */}
      {showModal && morningBriefing && (
        <BriefingModal
          briefing={morningBriefing}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
