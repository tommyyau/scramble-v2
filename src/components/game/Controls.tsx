import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import type { TiltDirection } from '../../lib/headtracking/types'

interface ControlsProps {
  onMoveLeft: () => void
  onMoveRight: () => void
  onDrop: () => void
  disabled?: boolean
  flashDirection?: TiltDirection
}

export default function Controls({
  onMoveLeft,
  onMoveRight,
  onDrop,
  disabled,
  flashDirection,
}: ControlsProps) {
  const isLeftFlashing = flashDirection === 'left'
  const isRightFlashing = flashDirection === 'right'
  const isDropFlashing = flashDirection === 'drop'

  return (
    <div className="flex items-center justify-center gap-4 mt-4">
      <button
        onClick={onMoveLeft}
        disabled={disabled}
        className={`
          w-16 h-16 rounded-full
          text-white
          flex items-center justify-center
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-150
          shadow-lg
          ${
            isLeftFlashing
              ? 'bg-yellow-400 scale-110 shadow-yellow-400/50'
              : 'bg-slate-700/80 active:bg-slate-600'
          }
        `}
        aria-label="Move left"
      >
        <ChevronLeft size={32} />
      </button>

      <button
        onClick={onDrop}
        disabled={disabled}
        className={`
          w-20 h-20 rounded-full
          text-white
          flex items-center justify-center
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-150
          shadow-lg
          ${
            isDropFlashing
              ? 'bg-yellow-400 scale-110 shadow-yellow-400/50'
              : 'bg-primary active:bg-primary/80'
          }
        `}
        aria-label="Drop"
      >
        <ChevronDown size={40} />
      </button>

      <button
        onClick={onMoveRight}
        disabled={disabled}
        className={`
          w-16 h-16 rounded-full
          text-white
          flex items-center justify-center
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-150
          shadow-lg
          ${
            isRightFlashing
              ? 'bg-yellow-400 scale-110 shadow-yellow-400/50'
              : 'bg-slate-700/80 active:bg-slate-600'
          }
        `}
        aria-label="Move right"
      >
        <ChevronRight size={32} />
      </button>
    </div>
  )
}
