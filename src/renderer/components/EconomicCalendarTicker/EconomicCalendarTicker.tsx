import { useState, useEffect } from 'react'
import { Calendar, Loader2 } from 'lucide-react'
import { useEconomicCalendarStore, formatEventForTicker } from '../../stores/economicCalendarStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { SetupPrompt } from '../common/SetupPrompt'

export function EconomicCalendarTicker() {
  const events = useEconomicCalendarStore(state => state.events)
  const loading = useEconomicCalendarStore(state => state.loading)
  const error = useEconomicCalendarStore(state => state.error)
  const fetchEvents = useEconomicCalendarStore(state => state.fetchEvents)
  const tickerSpeed = useSettingsStore(state => state.tickerSpeed)
  const [isPaused, setIsPaused] = useState(false)

  // Fetch events on mount if empty
  useEffect(() => {
    if (events.length === 0 && !loading && !error) {
      fetchEvents()
    }
  }, [])

  // Refresh countdown every minute
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  // Use tickerSpeed directly as seconds (60-600 range)
  const animationDuration = `${tickerSpeed}s`

  // Filter to high/medium importance upcoming events
  const upcomingEvents = events.filter(e =>
    e.importance !== 'low' && new Date(e.date) > new Date()
  ).slice(0, 10)

  // Show loading state
  if (upcomingEvents.length === 0 && loading) {
    return (
      <div className="panel h-full flex items-center overflow-hidden">
        <div className="flex items-center gap-2 px-3 flex-shrink-0">
          <Calendar size={14} className="text-terminal-amber" />
          <span className="text-[11px] font-semibold tracking-wider text-white uppercase">Economic Calendar</span>
          <span className="text-terminal-border text-lg font-light">|</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Loading events...</span>
        </div>
      </div>
    )
  }

  // Show empty/error state
  if (upcomingEvents.length === 0) {
    return (
      <div className="panel h-full flex items-center overflow-hidden">
        <div className="flex items-center gap-2 px-3 flex-shrink-0">
          <Calendar size={14} className="text-terminal-amber" />
          <span className="text-[11px] font-semibold tracking-wider text-white uppercase">Economic Calendar</span>
          <span className="text-terminal-border text-lg font-light">|</span>
        </div>
        {error ? (
          <SetupPrompt
            compact
            title="FRED API needed"
            helpSection="api-limits"
          />
        ) : (
          <span className="text-xs text-gray-500">No upcoming events</span>
        )}
      </div>
    )
  }

  // Duplicate events for seamless scrolling
  const duplicatedEvents = [...upcomingEvents, ...upcomingEvents]

  return (
    <div className="panel h-full flex items-center overflow-hidden">
      {/* Fixed label section */}
      <div className="flex items-center gap-2 px-3 flex-shrink-0 z-10 bg-terminal-panel">
        <Calendar size={14} className="text-terminal-amber" />
        <span className="text-[11px] font-semibold tracking-wider text-white uppercase">Economic Calendar</span>
        <span className="w-1.5 h-1.5 bg-terminal-amber rounded-full animate-pulse" />
        <span className="text-terminal-border text-lg font-light">|</span>
      </div>

      {/* Scrolling events with left fade effect */}
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
            {duplicatedEvents.map((event, index) => (
              <CalendarEventItem key={`${event.id}-${index}`} event={event} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface CalendarEventItemProps {
  event: {
    id: string
    event: string
    date: Date
    importance: 'low' | 'medium' | 'high'
  }
}

function CalendarEventItem({ event }: CalendarEventItemProps) {
  const text = formatEventForTicker(event as any)

  const importanceColors = {
    high: 'text-red-400',
    medium: 'text-yellow-400',
    low: 'text-gray-400'
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-1.5 h-1.5 rounded-full ${
        event.importance === 'high' ? 'bg-red-400' :
        event.importance === 'medium' ? 'bg-yellow-400' : 'bg-gray-400'
      }`} />
      <span className={importanceColors[event.importance]}>
        {text}
      </span>
    </div>
  )
}
