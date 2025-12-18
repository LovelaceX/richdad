/**
 * AnalysisProgress Component
 * Shows animated step-by-step AI analysis phases
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Loader2, CheckCircle, XCircle } from 'lucide-react'
import type { AnalysisProgress as AnalysisProgressType, AnalysisPhase } from '../../types'

interface Props {
  progress: AnalysisProgressType
}

const PhaseIcon = ({ status }: { status: AnalysisPhase['status'] }) => {
  switch (status) {
    case 'pending':
      return <Clock size={12} className="text-terminal-text/40" />
    case 'active':
      return <Loader2 size={12} className="text-terminal-amber animate-spin" />
    case 'complete':
      return <CheckCircle size={12} className="text-green-500" />
    case 'error':
      return <XCircle size={12} className="text-red-500" />
  }
}

const getStatusColor = (status: AnalysisPhase['status']) => {
  switch (status) {
    case 'pending':
      return 'text-terminal-text/40'
    case 'active':
      return 'text-terminal-amber'
    case 'complete':
      return 'text-terminal-text/70'
    case 'error':
      return 'text-red-400'
  }
}

export function AnalysisProgress({ progress }: Props) {
  const completedCount = progress.phases.filter(p => p.status === 'complete').length
  const totalCount = progress.phases.length

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-3 bg-terminal-bg/80 rounded border border-terminal-amber/30 mb-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="text-terminal-amber animate-spin" />
          <span className="text-xs font-medium text-terminal-amber">
            Analyzing {progress.ticker}
          </span>
        </div>
        <span className="text-[10px] text-terminal-text/50">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-terminal-border rounded-full mb-3 overflow-hidden">
        <motion.div
          className="h-full bg-terminal-amber"
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / totalCount) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Phase list */}
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {progress.phases.map((phase, index) => (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <PhaseIcon status={phase.status} />
              <span className={`text-xs flex-1 ${getStatusColor(phase.status)}`}>
                {phase.label}
              </span>
              {phase.result && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] text-terminal-text/50 font-mono truncate max-w-[100px]"
                  title={phase.result}
                >
                  {phase.result}
                </motion.span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
