import { GameMode } from '../../lib/types'
import { Gamepad2, Leaf, Timer, Calendar, Book, Trophy } from 'lucide-react'

interface ModeSelectProps {
  onSelectMode: (mode: GameMode) => void
  onShowWordBank?: () => void
  onShowLeaderboard?: () => void
}

const modes: { mode: GameMode; name: string; description: string; icon: typeof Gamepad2 }[] = [
  {
    mode: 'classic',
    name: 'Classic',
    description: 'Blocks fall, speed increases. Find words to survive!',
    icon: Gamepad2,
  },
  {
    mode: 'zen',
    name: 'Zen',
    description: 'No timer, no pressure. Blocks drop when you want.',
    icon: Leaf,
  },
  {
    mode: 'sprint',
    name: 'Sprint',
    description: '2 minutes to score as high as possible!',
    icon: Timer,
  },
  {
    mode: 'daily',
    name: 'Daily Challenge',
    description: 'Same puzzle for everyone. Compare scores!',
    icon: Calendar,
  },
]

export default function ModeSelect({ onSelectMode, onShowWordBank, onShowLeaderboard }: ModeSelectProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-black text-white mb-2">Scramble</h1>
      <p className="text-slate-400 mb-8">A word-finding puzzle game</p>

      <div className="grid gap-4 w-full max-w-md">
        {modes.map(({ mode, name, description, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => onSelectMode(mode)}
            className="
              flex items-center gap-4 p-4
              bg-slate-800/50 rounded-xl
              border border-slate-700/50
              hover:bg-slate-700/50 hover:border-primary/50
              transition-all group
              text-left
            "
          >
            <div className="p-3 rounded-lg bg-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <Icon size={24} />
            </div>
            <div>
              <div className="font-bold text-white">{name}</div>
              <div className="text-sm text-slate-400">{description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-4 mt-8">
        {onShowWordBank && (
          <button
            onClick={onShowWordBank}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 hover:border-accent/50 transition-all text-slate-300 hover:text-white"
          >
            <Book size={18} />
            <span className="text-sm">Word Bank</span>
          </button>
        )}
        {onShowLeaderboard && (
          <button
            onClick={onShowLeaderboard}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 hover:border-accent/50 transition-all text-slate-300 hover:text-white"
          >
            <Trophy size={18} />
            <span className="text-sm">Leaderboard</span>
          </button>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        <p>Use arrow keys or swipe to move blocks</p>
        <p>Form words 3+ letters horizontally or vertically</p>
      </div>
    </div>
  )
}
