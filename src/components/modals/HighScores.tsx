import { useState, useEffect } from 'react'
import { Trophy, Calendar, Zap, Leaf } from 'lucide-react'
import { GameMode } from '../../lib/types'

interface Score {
  id: string
  name: string
  score: number
  words: number
  date: string
  mode: GameMode
}

interface HighScoresProps {
  mode?: GameMode
}

// Mock data for now - will be replaced with Vercel KV
const mockScores: Score[] = [
  { id: '1', name: 'Player1', score: 2500, words: 45, date: '2024-01-15', mode: 'classic' },
  { id: '2', name: 'WordMaster', score: 2200, words: 42, date: '2024-01-14', mode: 'classic' },
  { id: '3', name: 'Speedster', score: 1800, words: 38, date: '2024-01-13', mode: 'classic' },
  { id: '4', name: 'LetterPro', score: 1500, words: 32, date: '2024-01-12', mode: 'classic' },
  { id: '5', name: 'Newbie', score: 1200, words: 28, date: '2024-01-11', mode: 'classic' },
]

const modeIcons: Record<GameMode, typeof Trophy> = {
  classic: Trophy,
  zen: Leaf,
  sprint: Zap,
  daily: Calendar,
}

const modeLabels: Record<GameMode, string> = {
  classic: 'Classic',
  zen: 'Zen',
  sprint: 'Sprint',
  daily: 'Daily',
}

export default function HighScores({ mode = 'classic' }: HighScoresProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode>(mode)
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    setLoading(true)
    setTimeout(() => {
      setScores(mockScores.filter(s => s.mode === selectedMode))
      setLoading(false)
    }, 300)
  }, [selectedMode])

  const modes: GameMode[] = ['classic', 'zen', 'sprint', 'daily']

  return (
    <div>
      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        {modes.map(m => {
          const Icon = modeIcons[m]
          return (
            <button
              key={m}
              onClick={() => setSelectedMode(m)}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm
                transition-colors
                ${selectedMode === m
                  ? 'bg-primary text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }
              `}
            >
              <Icon size={14} />
              <span>{modeLabels[m]}</span>
            </button>
          )
        })}
      </div>

      {/* Scores list */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : scores.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          No scores yet. Be the first!
        </div>
      ) : (
        <div className="space-y-2">
          {scores.map((score, index) => (
            <div
              key={score.id}
              className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg"
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold
                ${index === 0 ? 'bg-yellow-500 text-yellow-900' :
                  index === 1 ? 'bg-slate-300 text-slate-700' :
                  index === 2 ? 'bg-amber-600 text-amber-100' :
                  'bg-slate-600 text-slate-300'}
              `}>
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="font-medium text-white">{score.name}</div>
                <div className="text-xs text-slate-400">{score.words} words</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-accent tabular-nums">
                  {score.score.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">{score.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
