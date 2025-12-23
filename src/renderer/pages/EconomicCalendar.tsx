import { useEffect, useState } from 'react'
import { Calendar, Filter, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useEconomicCalendarStore } from '../stores/economicCalendarStore'
import { getEventCountdown } from '../../services/fredService'
import type { EconomicEvent } from '../types'

type ImportanceFilter = 'all' | 'high' | 'medium' | 'low'

export function EconomicCalendar() {
  const {
    events,
    loading,
    error,
    lastUpdated,
    importanceFilter,
    setImportanceFilter,
    fetchEvents
  } = useEconomicCalendarStore()

  const [refreshing, setRefreshing] = useState(false)

  // Fetch events on mount
  useEffect(() => {
    if (events.length === 0 && !loading) {
      fetchEvents()
    }
  }, [])

  // Refresh countdown every minute
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchEvents()
    setRefreshing(false)
  }

  const filteredEvents = importanceFilter === 'all'
    ? events
    : events.filter(e => e.importance === importanceFilter)

  const getImportanceColor = (importance: 'low' | 'medium' | 'high') => {
    switch (importance) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/30'
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      case 'low': return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
    }
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleEventClick = async (event: EconomicEvent) => {
    if (event.url) {
      try {
        await openUrl(event.url)
      } catch (error) {
        window.open(event.url, '_blank', 'noopener,noreferrer')
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-terminal-bg overflow-hidden">
      {/* Header */}
      <div className="h-12 bg-terminal-panel border-b border-terminal-border flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-terminal-amber" />
          <span className="text-white font-medium">Economic Calendar</span>
          <span className="text-gray-500 text-sm">({filteredEvents.length})</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Filters */}
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-gray-500 mr-2" />
            {(['all', 'high', 'medium', 'low'] as ImportanceFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setImportanceFilter(f)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  importanceFilter === f
                    ? 'bg-terminal-amber/20 text-terminal-amber'
                    : 'text-gray-400 hover:text-white hover:bg-terminal-border/50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="p-1.5 rounded hover:bg-terminal-border/50 transition-colors disabled:opacity-50"
            title="Refresh calendar"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 text-sm">{error}</p>
              {error.includes('API key') && (
                <p className="text-gray-500 text-xs mt-1">
                  Add your Finnhub API key in Settings → Data Sources
                </p>
              )}
            </div>
          </div>
        )}

        {loading && events.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-terminal-amber mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Loading economic calendar...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No upcoming events</p>
            <p className="text-gray-600 text-sm mt-1">
              {error ? 'Check your API key configuration' : 'Try changing your filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-terminal-border">
              <div className="col-span-2">Date</div>
              <div className="col-span-1">Time</div>
              <div className="col-span-5">Event</div>
              <div className="col-span-2">Impact</div>
              <div className="col-span-2 text-right">Countdown</div>
            </div>

            {/* Event Rows */}
            {filteredEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event)}
                className="w-full grid grid-cols-12 gap-4 px-4 py-3 bg-terminal-panel border border-terminal-border rounded-lg hover:border-terminal-amber/50 transition-colors text-left group"
              >
                <div className="col-span-2 text-gray-300 text-sm">
                  {formatDate(event.date)}
                </div>
                <div className="col-span-1 text-gray-500 text-sm font-mono">
                  {event.time}
                </div>
                <div className="col-span-5 flex items-center gap-2">
                  <span className="text-white text-sm">{event.event}</span>
                  <ExternalLink className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="col-span-2">
                  <span className={`inline-block px-2 py-0.5 text-xs rounded border ${getImportanceColor(event.importance)}`}>
                    {event.importance.toUpperCase()}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-terminal-amber font-mono text-sm">
                    {getEventCountdown(new Date(event.date))}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated > 0 && (
          <div className="mt-4 text-center text-gray-600 text-xs">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}
