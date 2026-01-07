import { useEffect, useCallback, useState, useRef } from 'react'
import { useGameStore } from '../../stores/game'
import { GameMode } from '../../lib/types'
import { MODE_CONFIGS, getDropSpeedForLevel } from '../../lib/constants'
import { submitScore, submitScoreToCloud } from '../../lib/scores'
import { isSoundEnabled, setSoundEnabled } from '../../lib/sounds'
import Board from './Board'
import Controls from './Controls'
import ScoreDisplay from './ScoreDisplay'
import NextPreview from './NextPreview'
import WordList from './WordList'
import ModeSelect from './ModeSelect'
import WordPopup from './WordPopup'
import ChainIndicator from '../effects/ChainIndicator'
import LevelUpIndicator from '../effects/LevelUpIndicator'
import FloatingScore from '../effects/FloatingScore'
import CalibrationOverlay from '../head-tracking/CalibrationOverlay'
import HeadTrackingPreview from '../head-tracking/HeadTrackingPreview'
import { useHeadTracking } from '../../hooks/useHeadTracking'
import { CalibrationData, HeadGesture } from '../../lib/head-tracking/types'
import { ArrowLeft, Pause, Play, Trophy, Zap, Type, TrendingUp, Save, Check, Volume2, VolumeX } from 'lucide-react'

const LEVEL_UP_INTERVAL = 60 // seconds between level ups

interface GameProps {
  onShowWordBank?: () => void
  onShowLeaderboard?: () => void
}

// Load saved player name
const PLAYER_NAME_KEY = 'scramble-player-name'
function getStoredPlayerName(): string {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || ''
  } catch {
    return ''
  }
}
function storePlayerName(name: string): void {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name)
  } catch {
    // localStorage not available
  }
}

interface FloatingScoreEvent {
  id: number
  score: number
}

export default function Game({ onShowWordBank, onShowLeaderboard }: GameProps) {
  const [showModeSelect, setShowModeSelect] = useState(true)
  const [sprintTimer, setSprintTimer] = useState(120) // 2 minutes
  const [_levelTimer, setLevelTimer] = useState(LEVEL_UP_INTERVAL) // Internal timer, not displayed
  const [playerName, setPlayerName] = useState(getStoredPlayerName)
  const [scoreSaved, setScoreSaved] = useState(false)
  const [soundOn, setSoundOn] = useState(isSoundEnabled)
  const [floatingScores, setFloatingScores] = useState<FloatingScoreEvent[]>([])
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Head tracking state
  const [showCalibration, setShowCalibration] = useState(false)
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null)
  const [highlightedButton, setHighlightedButton] = useState<'left' | 'right' | 'drop' | null>(null)
  const [pendingMode, setPendingMode] = useState<GameMode | null>(null)

  const {
    blocks,
    nextLetter,
    score,
    level,
    wordsFound,
    gameOver,
    isPaused,
    isCelebrating,
    isShaking,
    mode,
    lastFoundWord,
    stats,
    particleEvent,
    levelUpEvent,
    currentStreak,
    currentBonusWord,
    startGame,
    pauseGame,
    resumeGame,
    moveLeft,
    moveRight,
    drop,
    gameTick,
    reset,
    endCelebration,
    triggerGameOver,
    endShake,
    clearParticles,
    clearLevelUp,
    levelUp,
  } = useGameStore()

  // Head tracking hook - only active in classic-experimental mode
  const isHeadTrackingMode = mode === 'classic-experimental'
  const handleGestureChange = useCallback((gesture: HeadGesture) => {
    if (gesture === 'left') {
      setHighlightedButton('left')
    } else if (gesture === 'right') {
      setHighlightedButton('right')
    } else if (gesture === 'down') {
      setHighlightedButton('drop')
    } else {
      setHighlightedButton(null)
    }
  }, [])

  const {
    isTracking,
    currentGesture,
    videoRef,
  } = useHeadTracking({
    enabled: isHeadTrackingMode && !showModeSelect && !showCalibration && !gameOver && !isPaused,
    calibrationData,
    onMoveLeft: moveLeft,
    onMoveRight: moveRight,
    onDrop: drop,
    onGestureChange: handleGestureChange,
  })

  // Handle mode selection
  const handleSelectMode = useCallback((selectedMode: GameMode) => {
    if (selectedMode === 'classic-experimental') {
      // Always recalibrate at the start of each game
      setPendingMode(selectedMode)
      setShowModeSelect(false)
      setShowCalibration(true)
      return
    }

    setShowModeSelect(false)
    setSprintTimer(120)
    setLevelTimer(LEVEL_UP_INTERVAL)
    startGame(selectedMode)
  }, [startGame])

  // Handle calibration complete
  const handleCalibrationComplete = useCallback((data: CalibrationData) => {
    setCalibrationData(data)
    setShowCalibration(false)
    setShowModeSelect(false)
    setSprintTimer(120)
    setLevelTimer(LEVEL_UP_INTERVAL)
    if (pendingMode) {
      startGame(pendingMode)
      setPendingMode(null)
    }
  }, [startGame, pendingMode])

  // Handle calibration cancel
  const handleCalibrationCancel = useCallback(() => {
    setShowCalibration(false)
    setPendingMode(null)
    setShowModeSelect(true)
  }, [])

  // Game loop for automatic dropping with level-based speed
  useEffect(() => {
    if (showModeSelect || gameOver || isPaused) return

    const config = MODE_CONFIGS[mode]
    if (!config.dropSpeed) return

    // Apply level-based speed increase if enabled for this mode
    const dropSpeed = config.speedIncreases
      ? getDropSpeedForLevel(config.dropSpeed, level)
      : config.dropSpeed

    const interval = setInterval(() => {
      gameTick()
    }, dropSpeed)

    return () => clearInterval(interval)
  }, [showModeSelect, gameOver, isPaused, mode, level, gameTick])

  // Sprint timer - combined effect to avoid race condition
  useEffect(() => {
    if (mode !== 'sprint' || gameOver || isPaused || showModeSelect) return

    const interval = setInterval(() => {
      setSprintTimer(prev => {
        if (prev <= 1) {
          // Time's up - trigger game over on next tick to avoid setState race
          setTimeout(triggerGameOver, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [mode, gameOver, isPaused, showModeSelect, triggerGameOver])

  // Level timer - time-based progression for Classic, Sprint, Daily (not Zen)
  useEffect(() => {
    if (showModeSelect || gameOver || isPaused || mode === 'zen') return

    const interval = setInterval(() => {
      setLevelTimer(prev => {
        if (prev <= 1) {
          return 0 // Signal to level up (handled in separate effect)
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [showModeSelect, gameOver, isPaused, mode])

  // Handle level up when timer reaches 0 (separate effect to avoid StrictMode double-call)
  useEffect(() => {
    if (_levelTimer === 0 && !showModeSelect && !gameOver && !isPaused && mode !== 'zen') {
      levelUp()
      setLevelTimer(LEVEL_UP_INTERVAL)
    }
  }, [_levelTimer, showModeSelect, gameOver, isPaused, mode, levelUp])

  // Screen shake timer - 300ms shake on big chains
  useEffect(() => {
    if (!isShaking) return

    const timer = setTimeout(() => {
      endShake()
    }, 300)

    return () => clearTimeout(timer)
  }, [isShaking, endShake])

  // Celebration pause - 1.5 seconds when words are found
  useEffect(() => {
    if (!isCelebrating) return

    const timer = setTimeout(() => {
      endCelebration()
    }, 1500)

    return () => clearTimeout(timer)
  }, [isCelebrating, endCelebration])

  // Trigger floating score when word is found
  useEffect(() => {
    if (lastFoundWord && lastFoundWord.score > 0) {
      setFloatingScores(prev => [...prev, { id: lastFoundWord.id, score: lastFoundWord.score }])
    }
  }, [lastFoundWord])

  // Remove floating score when animation completes
  const handleFloatingScoreComplete = useCallback((id: number) => {
    setFloatingScores(prev => prev.filter(fs => fs.id !== id))
  }, [])

  // Toggle sound
  const handleToggleSound = useCallback(() => {
    const newValue = !soundOn
    setSoundOn(newValue)
    setSoundEnabled(newValue)
  }, [soundOn])

  const handleSaveScore = useCallback(async () => {
    if (!playerName.trim()) {
      nameInputRef.current?.focus()
      return
    }

    const scoreData = {
      name: playerName.trim(),
      score,
      level,
      wordsFound: stats.totalWordsFound,
      longestWord: stats.longestWord,
      bestChain: stats.bestChain,
      bestStreak: stats.bestStreak,
      mode,
      wordHistory: stats.wordHistory,
    }

    storePlayerName(playerName.trim())

    // Save locally
    submitScore(scoreData)

    // Also submit to cloud (fire and forget, don't block UI)
    submitScoreToCloud(scoreData).catch(console.error)

    setScoreSaved(true)
  }, [playerName, score, level, stats, mode])

  const handleRestart = useCallback(() => {
    setSprintTimer(120)
    setLevelTimer(LEVEL_UP_INTERVAL)
    setScoreSaved(false)
    reset()
    startGame(mode)
  }, [reset, startGame, mode])

  const handleBackToMenu = useCallback(() => {
    setScoreSaved(false)
    reset()
    setShowModeSelect(true)
  }, [reset])

  // Show mode selection
  if (showModeSelect) {
    return (
      <ModeSelect
        onSelectMode={handleSelectMode}
        onShowWordBank={onShowWordBank}
        onShowLeaderboard={onShowLeaderboard}
      />
    )
  }

  // Show calibration overlay for head tracking
  if (showCalibration) {
    return (
      <CalibrationOverlay
        onComplete={handleCalibrationComplete}
        onCancel={handleCalibrationCancel}
      />
    )
  }

  const isSprintTimeUp = mode === 'sprint' && sprintTimer === 0
  const isEffectivelyGameOver = gameOver || isSprintTimeUp

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={handleBackToMenu}
          className="flex items-center gap-1 text-sm text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Menu</span>
        </button>
        <div className="text-center">
          <span className="text-xs uppercase tracking-wider text-slate-400">
            {mode === 'zen' ? 'Zen Mode' : mode === 'sprint' ? 'Sprint' : mode === 'daily' ? 'Daily' : mode === 'classic-experimental' ? 'Experimental' : 'Classic'}
          </span>
        </div>
        <button
          onClick={isPaused ? resumeGame : pauseGame}
          className="p-2 text-slate-300 hover:text-white transition-colors"
          disabled={isEffectivelyGameOver}
        >
          {isPaused ? <Play size={20} /> : <Pause size={20} />}
        </button>
      </header>

      {/* Main game area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
        {/* Stats row */}
        <div className="flex items-start justify-between w-full max-w-md mb-2 gap-4">
          <ScoreDisplay score={score} />
          {mode !== 'zen' && (
            <div className="text-center min-w-[50px]">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Level</div>
              <div className="text-2xl font-bold text-secondary tabular-nums">{level}</div>
            </div>
          )}
          {mode === 'sprint' && (
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Time</div>
              <div className={`text-2xl font-bold tabular-nums ${sprintTimer <= 10 ? 'text-primary animate-pulse' : 'text-white'}`}>
                {formatTime(sprintTimer)}
              </div>
            </div>
          )}
          <NextPreview letter={nextLetter} />
          <WordList words={wordsFound} />
        </div>

        {/* Multiplier indicators row */}
        <div className="flex items-center justify-center gap-3 w-full max-w-md mb-3">
          {/* Current streak */}
          {currentStreak > 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${currentStreak > 1 ? 'bg-orange-500/20 border border-orange-500/50' : 'bg-slate-700/50'}`}>
              <span className="text-xs text-orange-400 font-medium">STREAK</span>
              <span className={`text-sm font-bold ${currentStreak > 1 ? 'text-orange-400' : 'text-slate-400'}`}>
                {currentStreak}×
              </span>
            </div>
          )}

          {/* Bonus word target */}
          {currentBonusWord && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/50">
              <span className="text-xs text-yellow-400 font-medium">BONUS</span>
              <span className="text-sm font-bold text-yellow-400 tracking-wider">
                {currentBonusWord}
              </span>
            </div>
          )}
        </div>

        {/* Game board */}
        <div className={`relative ${isShaking ? 'animate-shake' : ''}`}>
          <Board
            blocks={blocks}
            onMoveLeft={moveLeft}
            onMoveRight={moveRight}
            onDrop={drop}
            particleEvent={particleEvent}
            onParticlesComplete={clearParticles}
          />

          {/* Word found popup (animated celebration) */}
          {lastFoundWord && (
            <WordPopup
              key={lastFoundWord.id}
              word={lastFoundWord.word}
              score={lastFoundWord.score}
              chainCount={lastFoundWord.chainCount}
              streakCount={lastFoundWord.streakCount}
              bonusWordMatched={lastFoundWord.bonusWordMatched}
            />
          )}

          {/* Chain indicator */}
          {lastFoundWord && lastFoundWord.chainCount > 1 && (
            <ChainIndicator
              key={`chain-${lastFoundWord.id}`}
              chainCount={lastFoundWord.chainCount}
            />
          )}

          {/* Level up indicator */}
          {levelUpEvent && (
            <LevelUpIndicator
              key={`level-${levelUpEvent}`}
              level={levelUpEvent}
              onComplete={clearLevelUp}
            />
          )}

          {/* Floating scores */}
          {floatingScores.map((fs) => (
            <FloatingScore
              key={fs.id}
              score={fs.score}
              x={150}
              y={120}
              onComplete={() => handleFloatingScoreComplete(fs.id)}
            />
          ))}

          {/* Pause overlay */}
          {isPaused && !isEffectivelyGameOver && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-4">Paused</div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={resumeGame}
                    className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Resume
                  </button>
                  <button
                    onClick={handleToggleSound}
                    className="px-6 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                  >
                    {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    Sound: {soundOn ? 'On' : 'Off'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Game over overlay */}
          {isEffectivelyGameOver && (
            <div className="absolute inset-0 bg-black/85 flex items-center justify-center rounded-xl overflow-hidden">
              <div className="text-center px-4 animate-bounce-in">
                <div className="text-2xl font-bold text-white mb-1">
                  {isSprintTimeUp ? "Time's Up!" : 'Game Over!'}
                </div>
                <div className="text-5xl font-black text-accent mb-4" style={{ textShadow: '0 0 30px rgba(255,230,109,0.5)' }}>
                  {score.toLocaleString()}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <Trophy size={16} className="mx-auto mb-1 text-accent" />
                    <div className="text-white font-bold">{stats.totalWordsFound}</div>
                    <div className="text-slate-400 text-xs">Words</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <TrendingUp size={16} className="mx-auto mb-1 text-secondary" />
                    <div className="text-white font-bold">{level}</div>
                    <div className="text-slate-400 text-xs">Level</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <Zap size={16} className="mx-auto mb-1 text-purple-400" />
                    <div className="text-white font-bold">{stats.bestChain > 1 ? `${stats.bestChain}x` : '-'}</div>
                    <div className="text-slate-400 text-xs">Chain</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-2">
                    <Type size={16} className="mx-auto mb-1 text-primary" />
                    <div className="text-white font-bold truncate text-xs">{stats.longestWord || '-'}</div>
                    <div className="text-slate-400 text-xs">Longest</div>
                  </div>
                </div>

                {/* Save score section */}
                {!scoreSaved ? (
                  <div className="mb-4">
                    <div className="flex gap-2 justify-center">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Your name"
                        maxLength={20}
                        className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm w-32 focus:outline-none focus:ring-2 focus:ring-accent"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveScore()}
                      />
                      <button
                        onClick={handleSaveScore}
                        className="px-4 py-2 bg-accent text-slate-900 rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center gap-1"
                      >
                        <Save size={16} />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 flex items-center justify-center gap-2 text-secondary">
                    <Check size={18} />
                    <span className="text-sm font-medium">Score saved!</span>
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleRestart}
                    className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={handleBackToMenu}
                    className="px-6 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
                  >
                    Menu
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Last found words - right-aligned, persists until next batch */}
        {lastFoundWord && (
          <div className="w-full max-w-md mt-2 flex justify-end items-center gap-2">
            <span className="text-sm text-accent font-medium">{lastFoundWord.word}</span>
            <span className="text-xs text-secondary font-bold">+{lastFoundWord.score}</span>
          </div>
        )}

        {/* Head tracking video preview - always render when in head tracking mode so camera can attach */}
        {isHeadTrackingMode && calibrationData && (
          <HeadTrackingPreview
            videoRef={videoRef}
            currentGesture={currentGesture}
            isTracking={isTracking}
          />
        )}

        {/* Touch controls */}
        <Controls
          onMoveLeft={moveLeft}
          onMoveRight={moveRight}
          onDrop={drop}
          disabled={isEffectivelyGameOver || isPaused}
          highlightedButton={isHeadTrackingMode ? highlightedButton : undefined}
        />

        {/* Instructions */}
        <div className="mt-4 text-center text-xs text-slate-500">
          {mode === 'classic-experimental' ? (
            <span>Move your head left, right, or down to control</span>
          ) : mode === 'zen' ? (
            <span>Take your time. Tap drop when ready.</span>
          ) : (
            <>
              <span className="hidden sm:inline">
                Use arrow keys or A/D to move, Space/S to drop
              </span>
              <span className="sm:hidden">
                Swipe left/right to move, down to drop
              </span>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
