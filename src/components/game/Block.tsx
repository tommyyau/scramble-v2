import { memo } from 'react'
import { Block as BlockType } from '../../lib/types'

interface BlockProps {
  block: BlockType
  cellSize: number
}

// Define colors and whether they need dark text for contrast
const blockStyles: Record<string, { bg: string; darkText: boolean }> = {
  // Vowels - warm colors
  A: { bg: '#FF6B6B', darkText: false },  // Coral - white text OK
  E: { bg: '#FFE66D', darkText: true },   // Yellow - needs dark text
  I: { bg: '#FF9FF3', darkText: true },   // Pink - needs dark text
  O: { bg: '#FFA07A', darkText: true },   // Light salmon - needs dark text
  U: { bg: '#FFB347', darkText: true },   // Orange - needs dark text
  // Common consonants - teal
  R: { bg: '#4ECDC4', darkText: false },
  S: { bg: '#4ECDC4', darkText: false },
  T: { bg: '#4ECDC4', darkText: false },
  L: { bg: '#4ECDC4', darkText: false },
  N: { bg: '#4ECDC4', darkText: false },
  // Rare letters - purple
  Q: { bg: '#A66CFF', darkText: false },
  X: { bg: '#A66CFF', darkText: false },
  Z: { bg: '#A66CFF', darkText: false },
  J: { bg: '#A66CFF', darkText: false },
  K: { bg: '#A66CFF', darkText: false },
}

const defaultStyle = { bg: '#48DBFB', darkText: false }

const getBlockStyle = (letter: string): React.CSSProperties => {
  const style = blockStyles[letter] || defaultStyle
  return {
    backgroundColor: style.bg,
    color: style.darkText ? '#1a1a2e' : '#ffffff',
  }
}

function BlockComponent({ block, cellSize }: BlockProps) {
  const style = getBlockStyle(block.letter)
  const baseStyle = blockStyles[block.letter] || defaultStyle

  // Determine box shadow based on state
  let boxShadow: string
  if (block.isCelebrating) {
    // Glowing celebration effect - bright, pulsing glow
    boxShadow = `0 0 15px ${baseStyle.bg}, 0 0 30px ${baseStyle.bg}, 0 0 45px ${baseStyle.bg}, inset 0 0 15px rgba(255,255,255,0.6)`
  } else if (block.isDisappearing) {
    boxShadow = `0 0 20px ${baseStyle.bg}, 0 0 40px ${baseStyle.bg}, inset 0 0 10px rgba(255,255,255,0.5)`
  } else {
    boxShadow = `inset 0 -2px 4px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)`
  }

  return (
    <div
      className={`
        absolute flex items-center justify-center
        rounded-lg font-bold
        ${block.isCelebrating ? 'animate-celebrate' : ''}
        ${block.isDisappearing ? 'animate-pop' : ''}
        ${block.locked && !block.isDisappearing && !block.isCelebrating ? 'animate-land' : ''}
      `}
      style={{
        left: block.x * cellSize,
        top: block.y * cellSize,
        width: cellSize - 2,
        height: cellSize - 2,
        fontSize: cellSize * 0.5,
        ...style,
        boxShadow,
        // Smooth position transitions for movement and falling
        transition: 'left 0.1s ease-out, top 0.05s ease-in',
      }}
    >
      {block.letter}
    </div>
  )
}

export default memo(BlockComponent)
