import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'

interface ControlsProps {
  onMoveLeft: () => void
  onMoveRight: () => void
  onDrop: () => void
  disabled?: boolean
  highlightedButton?: 'left' | 'right' | 'drop' | null
}

export default function Controls({ onMoveLeft, onMoveRight, onDrop, disabled, highlightedButton }: ControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 mt-4">
      <button
        onClick={onMoveLeft}
        disabled={disabled}
        className={`
          w-16 h-16 rounded-full
          bg-slate-700/80 text-white
          flex items-center justify-center
          active:scale-95 active:bg-slate-600
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
          shadow-lg
          ${highlightedButton === 'left' ? 'ring-4 ring-accent ring-offset-2 ring-offset-slate-900 scale-105 bg-slate-600' : ''}
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
          bg-primary text-white
          flex items-center justify-center
          active:scale-95 active:bg-primary/80
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
          shadow-lg
          ${highlightedButton === 'drop' ? 'ring-4 ring-accent ring-offset-2 ring-offset-slate-900 scale-105' : ''}
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
          bg-slate-700/80 text-white
          flex items-center justify-center
          active:scale-95 active:bg-slate-600
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
          shadow-lg
          ${highlightedButton === 'right' ? 'ring-4 ring-accent ring-offset-2 ring-offset-slate-900 scale-105 bg-slate-600' : ''}
        `}
        aria-label="Move right"
      >
        <ChevronRight size={32} />
      </button>
    </div>
  )
}
