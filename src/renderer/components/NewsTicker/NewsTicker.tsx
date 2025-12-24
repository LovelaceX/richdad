import { useState } from 'react'
import { Newspaper, Loader2, Maximize2 } from 'lucide-react'
import { useNewsStore } from '../../stores/newsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useNewsPanelStore } from '../../stores/newsPanelStore'
import { NewsItem } from './NewsItem'
import { SetupPrompt } from '../common/SetupPrompt'

export function NewsTicker() {
  const openPanel = useNewsPanelStore(state => state.openPanel)
  const headlines = useNewsStore(state => state.headlines)
  const loading = useNewsStore(state => state.loading)
  const tickerSpeed = useSettingsStore(state => state.tickerSpeed)
  const [isPaused, setIsPaused] = useState(false)

  // Use tickerSpeed directly as seconds (60-600 range)
  const animationDuration = `${tickerSpeed}s`

  // Show loading state if no headlines and still loading
  if (headlines.length === 0 && loading) {
    return (
      <div className="panel h-full flex items-center overflow-hidden">
        <div className="flex items-center gap-2 px-3 flex-shrink-0">
          <Newspaper size={14} className="text-terminal-amber" />
          <span className="text-[11px] font-semibold tracking-wider text-white uppercase">News Feed</span>
          <span className="text-terminal-border text-lg font-light">|</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Fetching news...</span>
        </div>
      </div>
    )
  }

  // Show empty state if no headlines after loading
  if (headlines.length === 0) {
    return (
      <div className="panel h-full flex items-center overflow-hidden">
        <div className="flex items-center gap-2 px-3 flex-shrink-0">
          <Newspaper size={14} className="text-terminal-amber" />
          <span className="text-[11px] font-semibold tracking-wider text-white uppercase">News Feed</span>
          <span className="text-terminal-border text-lg font-light">|</span>
        </div>
        <SetupPrompt
          compact
          title="Configure news in Settings → RSS"
          helpSection="news"
        />
      </div>
    )
  }

  // Duplicate headlines for seamless scrolling
  const duplicatedHeadlines = [...headlines, ...headlines]

  return (
    <div className="panel h-full flex items-center overflow-hidden">
      {/* Fixed label section */}
      <div className="flex items-center gap-2 px-3 flex-shrink-0 z-10 bg-terminal-panel">
        <button
          onClick={openPanel}
          className="flex items-center gap-2 hover:bg-terminal-border/50 px-2 py-1 -mx-2 -my-1 rounded transition-colors"
          title="Open News Panel"
        >
          <Newspaper size={14} className="text-terminal-amber" />
          <span className="text-[11px] font-semibold tracking-wider text-white uppercase">News Feed</span>
          <span className="w-1.5 h-1.5 bg-semantic-up rounded-full animate-pulse" />
          <Maximize2 size={12} className="text-gray-500 ml-1" />
        </button>
        <span className="text-terminal-border text-lg font-light">|</span>
      </div>

      {/* Scrolling headlines with left fade effect */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 20px, black 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20px, black 100%)'
        }}
      >
        <div className="flex items-center h-full">
          <div
            className={`flex gap-8 whitespace-nowrap ${isPaused ? '' : 'animate-ticker-scroll'}`}
            style={{ animationDuration: isPaused ? undefined : animationDuration }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {duplicatedHeadlines.map((item, index) => (
              <NewsItem key={`${item.id}-${index}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
