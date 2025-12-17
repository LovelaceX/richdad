import { useState } from 'react'
import { Newspaper, Loader2 } from 'lucide-react'
import { useNewsStore } from '../../stores/newsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { NewsItem } from './NewsItem'

export function NewsTicker() {
  const headlines = useNewsStore(state => state.headlines)
  const loading = useNewsStore(state => state.loading)
  const tickerSpeed = useSettingsStore(state => state.tickerSpeed)
  const [isPaused, setIsPaused] = useState(false)

  // Map speed to animation duration (slower = more readable)
  const speedToDuration = {
    slow: '300s',     // 5 minutes - very readable
    normal: '180s',   // 3 minutes - comfortable pace
    fast: '90s'       // 1.5 minutes - still readable
  }

  const animationDuration = speedToDuration[tickerSpeed]

  // Show loading state if no headlines and still loading
  if (headlines.length === 0 && loading) {
    return (
      <div className="panel h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 text-terminal-amber animate-spin mb-2" />
        <p className="text-sm text-gray-400">Fetching news...</p>
      </div>
    )
  }

  // Show empty state if no headlines after loading
  if (headlines.length === 0) {
    return (
      <div className="panel h-full flex flex-col items-center justify-center">
        <Newspaper className="w-6 h-6 text-gray-500 mb-2" />
        <p className="text-sm text-gray-400">No news available</p>
        <p className="text-xs text-gray-500 mt-1">News updates every 5 minutes</p>
      </div>
    )
  }

  // Duplicate headlines for seamless scrolling
  const duplicatedHeadlines = [...headlines, ...headlines]

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="panel-header flex items-center gap-2 flex-shrink-0">
        <Newspaper size={14} />
        <span>News Feed</span>
        <div className="flex-1" />
        <span className="text-[10px] text-gray-500 font-normal normal-case">
          Live
        </span>
        <span className="w-1.5 h-1.5 bg-semantic-up rounded-full animate-pulse" />
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 flex items-center">
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
