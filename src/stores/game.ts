import { create } from 'zustand'
import { GameState, GameMode, ClearedPosition } from '../lib/types'
import { createInitialState, spawnBlock, tick, isGameOver } from '../lib/engine/core'
import { moveBlock, hardDrop, applyGravity } from '../lib/engine/grid'
import { processChainReaction } from '../lib/engine/chains'
import { calculateWordScore } from '../lib/engine/scoring'
import {
  playWordClear,
  playChain,
  playLevelUp,
  playGameOver,
  playStreakContinue,
  playStreakBroken,
  playMove,
  playDrop,
  playBlockLand,
} from '../lib/sounds'

interface FoundWordEvent {
  word: string
  score: number
  id: number
  chainCount: number
}

export interface WordWithScore {
  word: string
  score: number
}

interface GameStats {
  longestWord: string
  bestChain: number
  totalWordsFound: number
  bestStreak: number
  wordHistory: WordWithScore[] // All words found with their individual scores
}

interface ParticleEvent {
  id: number
  positions: ClearedPosition[]
}

interface GameStore extends GameState {
  // Extra UI state
  lastFoundWord: FoundWordEvent | null
  isCelebrating: boolean
  isShaking: boolean
  stats: GameStats
  particleEvent: ParticleEvent | null
  levelUpEvent: number | null
  // Streak system
  currentStreak: number
  streakBroken: boolean
  // Actions
  startGame: (mode: GameMode) => void
  pauseGame: () => void
  resumeGame: () => void
  moveLeft: () => void
  moveRight: () => void
  drop: () => void
  gameTick: () => void
  reset: () => void
  endCelebration: () => void
  triggerGameOver: () => void
  endShake: () => void
  clearParticles: () => void
  clearLevelUp: () => void
  levelUp: () => void
  clearStreakBroken: () => void
}

let wordEventId = 0

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  blocks: [],
  nextLetter: null,
  score: 0,
  level: 1,
  linesCleared: 0,
  wordsFound: [],
  bonusWordsFound: [],
  bonusWordsTarget: [],
  chainMultiplier: 1,
  gameOver: false,
  isPaused: false,
  mode: 'classic',
  lastFoundWord: null,
  isCelebrating: false,
  isShaking: false,
  stats: {
    longestWord: '',
    bestChain: 0,
    totalWordsFound: 0,
    bestStreak: 0,
    wordHistory: [],
  },
  particleEvent: null,
  levelUpEvent: null,
  currentStreak: 0,
  streakBroken: false,

  endCelebration: () => {
    set({ isCelebrating: false })
  },

  endShake: () => {
    set({ isShaking: false })
  },

  clearParticles: () => {
    set({ particleEvent: null })
  },

  clearLevelUp: () => {
    set({ levelUpEvent: null })
  },

  clearStreakBroken: () => {
    set({ streakBroken: false })
  },

  levelUp: () => {
    const state = get()
    const newLevel = state.level + 1
    playLevelUp()
    set({
      level: newLevel,
      levelUpEvent: newLevel,
    })
  },

  triggerGameOver: () => {
    set({ gameOver: true })
  },

  // Actions
  startGame: (mode: GameMode) => {
    const initialState = createInitialState(mode)
    const stateWithBlock = spawnBlock(initialState, initialState.nextLetter!)
    set({ ...stateWithBlock })
  },

  pauseGame: () => {
    set({ isPaused: true })
  },

  resumeGame: () => {
    set({ isPaused: false })
  },

  moveLeft: () => {
    const state = get()
    if (state.gameOver || state.isPaused) return

    const newState = moveBlock(state, 'left')
    if (newState.blocks !== state.blocks) {
      playMove()
    }
    set({ blocks: newState.blocks })
  },

  moveRight: () => {
    const state = get()
    if (state.gameOver || state.isPaused) return

    const newState = moveBlock(state, 'right')
    if (newState.blocks !== state.blocks) {
      playMove()
    }
    set({ blocks: newState.blocks })
  },

  drop: () => {
    const state = get()
    if (state.gameOver || state.isPaused || state.isCelebrating) return

    // Play drop sound
    playDrop()

    // Hard drop
    let newState = hardDrop(state)

    // Play block land sound
    playBlockLand()

    // Process chains with streak bonus (streak of 1 = 1x, streak of 2 = 2x, etc.)
    const potentialStreak = state.currentStreak + 1
    const chainResult = processChainReaction(newState, potentialStreak)

    // Check for new words found
    const newWords = chainResult.wordsFound.filter(
      w => !state.wordsFound.includes(w)
    )
    const scoreGained = chainResult.score - state.score

    // Apply gravity after chains
    newState = applyGravity(chainResult)

    // Check game over
    if (isGameOver(newState)) {
      playGameOver()
      set({
        ...newState,
        gameOver: true,
      })
      return
    }

    // Spawn next block
    const nextState = spawnBlock(newState, newState.nextLetter!)

    // Emit word found event if words were found (keep previous if none found)
    const updates: Partial<GameStore> = {
      blocks: nextState.blocks,
      nextLetter: nextState.nextLetter,
      score: chainResult.score,
      wordsFound: chainResult.wordsFound,
    }

    if (newWords.length > 0) {
      // Play sounds for word clear and chains
      playWordClear()
      if (chainResult.chainCount > 1) {
        playChain(chainResult.chainCount)
      }

      // Update streak
      const newStreak = state.currentStreak + 1
      updates.currentStreak = newStreak
      updates.streakBroken = false

      // Play streak sound for consecutive finds
      if (newStreak > 1) {
        playStreakContinue(newStreak)
      }

      // Update stats
      const currentStats = state.stats
      const longestNew = newWords.reduce((a, b) => a.length > b.length ? a : b, '')
      const newLongest = longestNew.length > currentStats.longestWord.length ? longestNew : currentStats.longestWord
      const newBestChain = Math.max(currentStats.bestChain, chainResult.chainCount)
      const newBestStreak = Math.max(currentStats.bestStreak, newStreak)

      // Calculate individual word scores for history
      const newWordsWithScores: WordWithScore[] = newWords.map(word => ({
        word,
        score: calculateWordScore(word, { chainMultiplier: chainResult.chainCount, streakMultiplier: potentialStreak }),
      }))

      updates.lastFoundWord = {
        word: newWords.join(', '),
        score: scoreGained,
        id: ++wordEventId,
        chainCount: chainResult.chainCount,
      }
      updates.isCelebrating = true
      updates.stats = {
        longestWord: newLongest,
        bestChain: newBestChain,
        totalWordsFound: currentStats.totalWordsFound + newWords.length,
        bestStreak: newBestStreak,
        wordHistory: [...currentStats.wordHistory, ...newWordsWithScores],
      }

      // Trigger particles at cleared positions
      if (chainResult.clearedPositions.length > 0) {
        updates.particleEvent = {
          id: wordEventId,
          positions: chainResult.clearedPositions,
        }
      }

      // Trigger screen shake on word finds (subtle for single, stronger for chains)
      updates.isShaking = true
    } else {
      // No words found - break streak if we had one
      if (state.currentStreak > 0) {
        playStreakBroken()
        updates.currentStreak = 0
        updates.streakBroken = true
      }
    }

    set(updates)
  },

  gameTick: () => {
    const state = get()
    if (state.gameOver || state.isPaused || state.isCelebrating) return

    // Move active block down
    let newState = tick(state)

    // Check if block just locked
    const wasLocked = !state.blocks.find(b => !b.locked)
    const isLocked = !newState.blocks.find(b => !b.locked)

    if (!wasLocked && isLocked) {
      // Block just locked - play land sound
      playBlockLand()

      // Process chains with streak bonus (streak of 1 = 1x, streak of 2 = 2x, etc.)
      const potentialStreak = state.currentStreak + 1
      const chainResult = processChainReaction(newState, potentialStreak)

      // Check for new words found
      const newWords = chainResult.wordsFound.filter(
        w => !state.wordsFound.includes(w)
      )
      const scoreGained = chainResult.score - state.score

      // Apply gravity
      newState = applyGravity(chainResult)

      // Check game over
      if (isGameOver(newState)) {
        playGameOver()
        set({
          ...newState,
          gameOver: true,
        })
        return
      }

      // Spawn next block
      const nextState = spawnBlock(newState, newState.nextLetter!)

      // Emit word found event if words were found (keep previous if none found)
      const updates: Partial<GameStore> = {
        blocks: nextState.blocks,
        nextLetter: nextState.nextLetter,
        score: chainResult.score,
        wordsFound: chainResult.wordsFound,
      }

      if (newWords.length > 0) {
        // Play sounds for word clear and chains
        playWordClear()
        if (chainResult.chainCount > 1) {
          playChain(chainResult.chainCount)
        }

        // Update streak
        const newStreak = state.currentStreak + 1
        updates.currentStreak = newStreak
        updates.streakBroken = false

        // Play streak sound for consecutive finds
        if (newStreak > 1) {
          playStreakContinue(newStreak)
        }

        // Update stats
        const currentStats = state.stats
        const longestNew = newWords.reduce((a, b) => a.length > b.length ? a : b, '')
        const newLongest = longestNew.length > currentStats.longestWord.length ? longestNew : currentStats.longestWord
        const newBestChain = Math.max(currentStats.bestChain, chainResult.chainCount)
        const newBestStreak = Math.max(currentStats.bestStreak, newStreak)

        // Calculate individual word scores for history
        const newWordsWithScores: WordWithScore[] = newWords.map(word => ({
          word,
          score: calculateWordScore(word, { chainMultiplier: chainResult.chainCount, streakMultiplier: potentialStreak }),
        }))

        updates.lastFoundWord = {
          word: newWords.join(', '),
          score: scoreGained,
          id: ++wordEventId,
          chainCount: chainResult.chainCount,
        }
        updates.isCelebrating = true
        updates.stats = {
          longestWord: newLongest,
          bestChain: newBestChain,
          totalWordsFound: currentStats.totalWordsFound + newWords.length,
          bestStreak: newBestStreak,
          wordHistory: [...currentStats.wordHistory, ...newWordsWithScores],
        }

        // Trigger particles at cleared positions
        if (chainResult.clearedPositions.length > 0) {
          updates.particleEvent = {
            id: wordEventId,
            positions: chainResult.clearedPositions,
          }
        }

        // Trigger screen shake on word finds (subtle for single, stronger for chains)
        updates.isShaking = true
      } else {
        // No words found - break streak if we had one
        if (state.currentStreak > 0) {
          playStreakBroken()
          updates.currentStreak = 0
          updates.streakBroken = true
        }
      }

      set(updates)
    } else {
      set({ blocks: newState.blocks })
    }
  },

  reset: () => {
    set({
      blocks: [],
      nextLetter: null,
      score: 0,
      level: 1,
      linesCleared: 0,
      wordsFound: [],
      bonusWordsFound: [],
      bonusWordsTarget: [],
      chainMultiplier: 1,
      gameOver: false,
      isPaused: false,
      lastFoundWord: null,
      isCelebrating: false,
      isShaking: false,
      stats: {
        longestWord: '',
        bestChain: 0,
        totalWordsFound: 0,
        bestStreak: 0,
        wordHistory: [],
      },
      particleEvent: null,
      levelUpEvent: null,
      currentStreak: 0,
      streakBroken: false,
    })
  },
}))
