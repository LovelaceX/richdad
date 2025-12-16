import { useState } from 'react'
import { Newspaper } from 'lucide-react'
import { useNewsStore } from '../../stores/newsStore'
import { NewsItem } from './NewsItem'

export function NewsTicker() {
  const headlines = useNewsStore(state => state.headlines)
  const [isPaused, setIsPaused] = useState(false)

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
