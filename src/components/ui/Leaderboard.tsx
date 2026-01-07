import { useState, useMemo, useEffect } from 'react'
import { ArrowLeft, Trophy, Calendar, Medal, Zap, Flame, Type, ChevronDown, ChevronUp, Star, Loader2 } from 'lucide-react'
import { fetchGlobalLeaderboard, ScoreEntry } from '../../lib/scores'
import { GameMode } from '../../lib/types'

interface LeaderboardProps {
  onBack: () => void
}

type TabType = 'today' | 'allTime'
type ModeFilter = 'all' | GameMode

export default function Leaderboard({ onBack }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('today')
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all')
  const [globalScores, setGlobalScores] = useState<ScoreEntry[]>([])
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch cloud scores when tab, filter changes, or on mount
  useEffect(() => {
    const fetchScores = async () => {
      setIsLoadingGlobal(true)
      try {
        const mode = modeFilter === 'all' ? undefined : modeFilter
        const timeframe = activeTab === 'today' ? 'today' : 'all'
        const scores = await fetchGlobalLeaderboard({ mode, limit: 10, timeframe })
        setGlobalScores(scores)
      } catch (error) {
        console.error('Failed to fetch cloud scores:', error)
        setGlobalScores([])
      } finally {
        setIsLoadingGlobal(false)
      }
    }

    fetchScores()
  }, [activeTab, modeFilter, refreshKey])

  // Refresh on mount to get latest scores
  useEffect(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const scores = useMemo(() => {
    return globalScores
  }, [globalScores])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400'
      case 2: return 'text-slate-300'
      case 3: return 'text-amber-600'
      default: return 'text-slate-500'
    }
  }

  const getModeLabel = (mode: GameMode): string => {
    switch (mode) {
      case 'classic': return 'Classic'
      case 'zen': return 'Zen'
      case 'sprint': return 'Sprint'
      case 'daily': return 'Daily'
      case 'classic-experimental': return 'Experimental'
    }
  }

  const getModeColor = (mode: GameMode): string => {
    switch (mode) {
      case 'classic': return 'bg-primary/20 text-primary'
      case 'zen': return 'bg-secondary/20 text-secondary'
      case 'sprint': return 'bg-purple-500/20 text-purple-400'
      case 'daily': return 'bg-accent/20 text-accent'
      case 'classic-experimental': return 'bg-amber-500/20 text-amber-400'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-accent" />
          <span className="font-bold text-white">Leaderboard</span>
        </div>
        <div className="w-16" /> {/* Spacer for centering */}
      </header>

      {/* Tabs */}
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto flex bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors ${
              activeTab === 'today'
                ? 'bg-primary text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar size={16} />
            <span className="text-sm font-medium">Today</span>
          </button>
          <button
            onClick={() => setActiveTab('allTime')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors ${
              activeTab === 'allTime'
                ? 'bg-secondary text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy size={16} />
            <span className="text-sm font-medium">All-Time</span>
          </button>
        </div>

        {/* Mode filter */}
        <div className="max-w-lg mx-auto flex gap-2 mt-3 overflow-x-auto pb-1">
          {(['all', 'classic', 'zen', 'sprint', 'daily'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                modeFilter === mode
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-700/50 text-slate-400 hover:text-white'
              }`}
            >
              {mode === 'all' ? 'All Modes' : getModeLabel(mode as GameMode)}
            </button>
          ))}
        </div>
      </div>

      {/* Score list */}
      <main className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="max-w-lg mx-auto space-y-2">
          {isLoadingGlobal ? (
            <div className="text-center py-12">
              <Loader2 size={48} className="mx-auto text-secondary mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-slate-400">
                Loading scores...
              </h3>
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">
                No Scores Yet
              </h3>
              <p className="text-sm text-slate-500">
                {activeTab === 'today'
                  ? 'No games played today yet!'
                  : 'Be the first to submit a score!'}
              </p>
            </div>
          ) : (
            scores.map((score, index) => (
              <ScoreRow
                key={score.id}
                score={score}
                rank={index + 1}
                getMedalColor={getMedalColor}
                getModeLabel={getModeLabel}
                getModeColor={getModeColor}
                formatDate={formatDate}
              />
            ))
          )}
        </div>
      </main>
    </div>
  )
}

interface ScoreRowProps {
  score: ScoreEntry
  rank: number
  getMedalColor: (rank: number) => string
  getModeLabel: (mode: GameMode) => string
  getModeColor: (mode: GameMode) => string
  formatDate: (date: string) => string
}

function ScoreRow({
  score,
  rank,
  getMedalColor,
  getModeLabel,
  getModeColor,
  formatDate,
}: ScoreRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Find highest scoring word
  const highestScoringWord = useMemo(() => {
    if (!score.wordHistory || score.wordHistory.length === 0) return null
    return score.wordHistory.reduce((best, current) =>
      current.score > best.score ? current : best
    , score.wordHistory[0])
  }, [score.wordHistory])

  // Count bonus words
  const bonusWordCount = useMemo(() => {
    if (!score.wordHistory) return 0
    return score.wordHistory.filter(w => w.isBonus).length
  }, [score.wordHistory])

  const hasWordHistory = score.wordHistory && score.wordHistory.length > 0

  return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden hover:bg-slate-800/70 transition-colors">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Rank */}
          <div className="flex-shrink-0 w-8 text-center">
            {rank <= 3 ? (
              <Medal size={24} className={getMedalColor(rank)} />
            ) : (
              <span className="text-lg font-bold text-slate-500">{rank}</span>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white truncate">{score.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${getModeColor(score.mode)}`}>
                {getModeLabel(score.mode)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Level {score.level}</span>
              <span className="flex items-center gap-1">
                <Type size={12} />
                {score.wordsFound} words
              </span>
              {score.bestStreak > 1 && (
                <span className="flex items-center gap-1 text-orange-400">
                  <Flame size={12} />
                  {score.bestStreak} streak
                </span>
              )}
              {score.bestChain > 1 && (
                <span className="flex items-center gap-1 text-purple-400">
                  <Zap size={12} />
                  {score.bestChain}x combo
                </span>
              )}
              {bonusWordCount > 0 && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star size={12} />
                  {bonusWordCount} bonus
                </span>
              )}
            </div>

            {highestScoringWord && (
              <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                <Star size={10} className="text-accent" />
                Best: <span className="text-accent font-mono">{highestScoringWord.word}</span>
                <span className="text-secondary">+{highestScoringWord.score}</span>
              </div>
            )}
          </div>

          {/* Score */}
          <div className="flex-shrink-0 text-right">
            <div className="text-xl font-bold text-accent tabular-nums">
              {score.score.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">{formatDate(score.date)}</div>
          </div>
        </div>

        {/* Expand button for word history */}
        {hasWordHistory && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors ml-11"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{isExpanded ? 'Hide words' : 'Show all words'}</span>
          </button>
        )}
      </div>

      {/* Expanded word history */}
      {isExpanded && hasWordHistory && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-11 flex flex-wrap gap-2">
            {score.wordHistory!.map((item, idx) => {
              const isHighest = highestScoringWord && item.word === highestScoringWord.word && item.score === highestScoringWord.score
              const hasMultipliers = item.streakMultiplier || item.chainMultiplier || item.isBonus
              return (
                <div
                  key={`${item.word}-${idx}`}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    isHighest
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : hasMultipliers
                        ? 'bg-slate-600/50 text-white'
                        : 'bg-slate-700/50 text-slate-300'
                  }`}
                >
                  <span className="font-mono">{item.word}</span>
                  {item.isBonus && (
                    <Star size={10} className="text-yellow-400" />
                  )}
                  {item.streakMultiplier && (
                    <span className="flex items-center text-orange-400">
                      <Flame size={10} />
                      <span className="text-[10px]">{item.streakMultiplier}×</span>
                    </span>
                  )}
                  {item.chainMultiplier && (
                    <span className="flex items-center text-purple-400">
                      <Zap size={10} />
                      <span className="text-[10px]">{item.chainMultiplier}×</span>
                    </span>
                  )}
                  <span className={`text-xs ${isHighest ? 'text-accent' : 'text-secondary'}`}>
                    +{item.score}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
