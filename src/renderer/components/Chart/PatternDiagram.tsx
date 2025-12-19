import { memo } from 'react'

interface PatternDiagramProps {
  pattern: string
  className?: string
}

// Candlestick component for building patterns
function Candle({
  x,
  bodyTop,
  bodyHeight,
  wickTop,
  wickBottom,
  isBullish,
  width = 10,
}: {
  x: number
  bodyTop: number
  bodyHeight: number
  wickTop: number
  wickBottom: number
  isBullish: boolean
  width?: number
}) {
  const color = isBullish ? '#4af6c3' : '#ff433d'
  const centerX = x + width / 2

  return (
    <g>
      {/* Upper wick */}
      <line
        x1={centerX}
        y1={wickTop}
        x2={centerX}
        y2={bodyTop}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Body */}
      <rect
        x={x}
        y={bodyTop}
        width={width}
        height={Math.max(bodyHeight, 2)}
        fill={color}
        rx={1}
      />
      {/* Lower wick */}
      <line
        x1={centerX}
        y1={bodyTop + bodyHeight}
        x2={centerX}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1.5}
      />
    </g>
  )
}

// Pattern diagram definitions
const PATTERN_DIAGRAMS: Record<string, JSX.Element> = {
  // Single-candle patterns
  'Doji': (
    <svg width="30" height="50" viewBox="0 0 30 50">
      <Candle x={10} bodyTop={24} bodyHeight={2} wickTop={8} wickBottom={42} isBullish={true} />
    </svg>
  ),

  'Hammer': (
    <svg width="30" height="50" viewBox="0 0 30 50">
      <Candle x={10} bodyTop={8} bodyHeight={10} wickTop={8} wickBottom={45} isBullish={true} />
    </svg>
  ),

  'Hanging Man': (
    <svg width="30" height="50" viewBox="0 0 30 50">
      <Candle x={10} bodyTop={8} bodyHeight={10} wickTop={8} wickBottom={45} isBullish={false} />
    </svg>
  ),

  'Shooting Star': (
    <svg width="30" height="50" viewBox="0 0 30 50">
      <Candle x={10} bodyTop={32} bodyHeight={10} wickTop={5} wickBottom={42} isBullish={false} />
    </svg>
  ),

  'Inverted Hammer': (
    <svg width="30" height="50" viewBox="0 0 30 50">
      <Candle x={10} bodyTop={32} bodyHeight={10} wickTop={5} wickBottom={42} isBullish={true} />
    </svg>
  ),

  // Two-candle patterns
  'Bullish Engulfing': (
    <svg width="50" height="50" viewBox="0 0 50 50">
      <Candle x={5} bodyTop={15} bodyHeight={18} wickTop={10} wickBottom={38} isBullish={false} width={12} />
      <Candle x={25} bodyTop={10} bodyHeight={28} wickTop={5} wickBottom={43} isBullish={true} width={16} />
    </svg>
  ),

  'Bearish Engulfing': (
    <svg width="50" height="50" viewBox="0 0 50 50">
      <Candle x={5} bodyTop={18} bodyHeight={18} wickTop={12} wickBottom={40} isBullish={true} width={12} />
      <Candle x={25} bodyTop={12} bodyHeight={28} wickTop={7} wickBottom={45} isBullish={false} width={16} />
    </svg>
  ),

  'Piercing Line': (
    <svg width="50" height="50" viewBox="0 0 50 50">
      <Candle x={5} bodyTop={10} bodyHeight={25} wickTop={5} wickBottom={40} isBullish={false} width={14} />
      <Candle x={28} bodyTop={18} bodyHeight={22} wickTop={15} wickBottom={45} isBullish={true} width={14} />
    </svg>
  ),

  'Dark Cloud Cover': (
    <svg width="50" height="50" viewBox="0 0 50 50">
      <Candle x={5} bodyTop={15} bodyHeight={25} wickTop={10} wickBottom={45} isBullish={true} width={14} />
      <Candle x={28} bodyTop={8} bodyHeight={22} wickTop={5} wickBottom={35} isBullish={false} width={14} />
    </svg>
  ),

  'Bullish Harami': (
    <svg width="50" height="50" viewBox="0 0 50 50">
      <Candle x={5} bodyTop={8} bodyHeight={30} wickTop={5} wickBottom={43} isBullish={false} width={16} />
      <Candle x={28} bodyTop={18} bodyHeight={12} wickTop={15} wickBottom={33} isBullish={true} width={10} />
    </svg>
  ),

  'Bearish Harami': (
    <svg width="50" height="50" viewBox="0 0 50 50">
      <Candle x={5} bodyTop={12} bodyHeight={30} wickTop={7} wickBottom={47} isBullish={true} width={16} />
      <Candle x={28} bodyTop={20} bodyHeight={12} wickTop={17} wickBottom={35} isBullish={false} width={10} />
    </svg>
  ),

  'Inside Bar': (
    <svg width="50" height="50" viewBox="0 0 50 50">
      <Candle x={5} bodyTop={8} bodyHeight={32} wickTop={5} wickBottom={45} isBullish={false} width={16} />
      <Candle x={28} bodyTop={15} bodyHeight={18} wickTop={12} wickBottom={38} isBullish={true} width={12} />
    </svg>
  ),

  'Outside Up': (
    <svg width="50" height="50" viewBox="0 0 50 50">
      <Candle x={5} bodyTop={18} bodyHeight={14} wickTop={15} wickBottom={35} isBullish={false} width={12} />
      <Candle x={25} bodyTop={8} bodyHeight={32} wickTop={5} wickBottom={45} isBullish={true} width={16} />
    </svg>
  ),

  'Outside Down': (
    <svg width="50" height="50" viewBox="0 0 50 50">
      <Candle x={5} bodyTop={18} bodyHeight={14} wickTop={15} wickBottom={35} isBullish={true} width={12} />
      <Candle x={25} bodyTop={8} bodyHeight={32} wickTop={5} wickBottom={45} isBullish={false} width={16} />
    </svg>
  ),

  // Three-candle patterns
  'Morning Star': (
    <svg width="70" height="50" viewBox="0 0 70 50">
      <Candle x={5} bodyTop={8} bodyHeight={28} wickTop={5} wickBottom={40} isBullish={false} width={14} />
      <Candle x={28} bodyTop={35} bodyHeight={6} wickTop={32} wickBottom={45} isBullish={true} width={10} />
      <Candle x={48} bodyTop={12} bodyHeight={25} wickTop={8} wickBottom={42} isBullish={true} width={14} />
    </svg>
  ),

  'Evening Star': (
    <svg width="70" height="50" viewBox="0 0 70 50">
      <Candle x={5} bodyTop={18} bodyHeight={25} wickTop={12} wickBottom={47} isBullish={true} width={14} />
      <Candle x={28} bodyTop={8} bodyHeight={6} wickTop={5} wickBottom={18} isBullish={false} width={10} />
      <Candle x={48} bodyTop={15} bodyHeight={28} wickTop={10} wickBottom={47} isBullish={false} width={14} />
    </svg>
  ),

  // Five-candle patterns
  'Breakaway Bullish': (
    <svg width="90" height="50" viewBox="0 0 90 50">
      <Candle x={2} bodyTop={10} bodyHeight={18} wickTop={7} wickBottom={32} isBullish={false} width={10} />
      <Candle x={18} bodyTop={22} bodyHeight={12} wickTop={18} wickBottom={38} isBullish={false} width={10} />
      <Candle x={34} bodyTop={28} bodyHeight={8} wickTop={25} wickBottom={40} isBullish={false} width={10} />
      <Candle x={50} bodyTop={32} bodyHeight={6} wickTop={30} wickBottom={42} isBullish={false} width={10} />
      <Candle x={66} bodyTop={15} bodyHeight={22} wickTop={10} wickBottom={42} isBullish={true} width={14} />
    </svg>
  ),

  'Breakaway Bearish': (
    <svg width="90" height="50" viewBox="0 0 90 50">
      <Candle x={2} bodyTop={22} bodyHeight={18} wickTop={18} wickBottom={43} isBullish={true} width={10} />
      <Candle x={18} bodyTop={15} bodyHeight={12} wickTop={12} wickBottom={30} isBullish={true} width={10} />
      <Candle x={34} bodyTop={12} bodyHeight={8} wickTop={10} wickBottom={23} isBullish={true} width={10} />
      <Candle x={50} bodyTop={10} bodyHeight={6} wickTop={8} wickBottom={18} isBullish={true} width={10} />
      <Candle x={66} bodyTop={12} bodyHeight={25} wickTop={8} wickBottom={42} isBullish={false} width={14} />
    </svg>
  ),
}

/**
 * PatternDiagram - Memoized to prevent unnecessary re-renders
 * Only re-renders when pattern or className props change
 */
export const PatternDiagram = memo(function PatternDiagram({ pattern, className = '' }: PatternDiagramProps) {
  const diagram = PATTERN_DIAGRAMS[pattern]

  if (!diagram) {
    // Fallback for unknown patterns - show generic candle
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <svg width="30" height="50" viewBox="0 0 30 50">
          <Candle x={10} bodyTop={15} bodyHeight={20} wickTop={8} wickBottom={42} isBullish={true} />
        </svg>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {diagram}
    </div>
  )
})
