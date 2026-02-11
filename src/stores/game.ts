import { create } from 'zustand'
import { GameState, GameMode, ClearedPosition, WordWithScore } from '../lib/types'
import { createInitialState, spawnBlock, tick, isGameOver } from '../lib/engine/core'
import { moveBlock, hardDrop, applyGravity } from '../lib/engine/grid'
import { detectAndMarkWords, clearCelebratingBlocks } from '../lib/engine/chains'
import { processBlockLocked, BlockLockedResult } from '../lib/engine/game-flow'
import { calculateWordScore } from '../lib/engine/scoring'
import { getRandomBonusWord, isBonusWordMatch, BONUS_WORD_MULTIPLIER } from '../lib/engine/bonus-word'
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
  streakCount: number
  bonusWordMatched: boolean
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
  // Bonus word system
  bonusWordMatched: boolean
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
  clearBonusWordMatched: () => void
}

let wordEventId = 0

// Helper to build store updates from processBlockLocked result
function buildWordResultUpdates(
  result: BlockLockedResult,
  currentState: GameStore,
  streakCount: number
): Partial<GameStore> {
  const updates: Partial<GameStore> = {
    blocks: result.state.blocks,
    score: result.state.score,
    wordsFound: result.state.wordsFound,
  }

  // Repeated words are valid and treated the same as new words
  if (result.wordsFound.length > 0) {
    const longestFound = result.wordsFound.reduce((a, b) => a.length > b.length ? a : b, '')
    const newLongest = longestFound.length > currentState.stats.longestWord.length
      ? longestFound
      : currentState.stats.longestWord
    const newBestChain = Math.max(currentState.stats.bestChain, result.chainCount)
    const newBestStreak = Math.max(currentState.stats.bestStreak, streakCount)

    updates.stats = {
      longestWord: newLongest,
      bestChain: newBestChain,
      totalWordsFound: currentState.stats.totalWordsFound + result.wordsFound.length,
      bestStreak: newBestStreak,
      wordHistory: [...currentState.stats.wordHistory, ...result.wordsWithScores],
    }

    updates.lastFoundWord = {
      word: result.wordsFound.join(', '),
      score: result.score,
      id: ++wordEventId,
      chainCount: result.chainCount,
      streakCount,
      bonusWordMatched: result.bonusWordMatched,
    }

    // Handle bonus word match
    if (result.bonusWordMatched && currentState.currentBonusWord) {
      updates.bonusWordsFound = [...currentState.bonusWordsFound, currentState.currentBonusWord]
      updates.currentBonusWord = getRandomBonusWord()
      updates.bonusWordMatched = true
    }

    // Trigger particles
    if (result.clearedPositions.length > 0) {
      updates.particleEvent = {
        id: wordEventId,
        positions: result.clearedPositions,
      }
    }

    updates.isShaking = true
  }

  return updates
}

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
  currentBonusWord: null,
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
  bonusWordMatched: false,

  endCelebration: () => {
    const state = get()

    // Phase 2: Clear celebrating blocks and apply gravity
    const clearedState = clearCelebratingBlocks(state)
    const withGravity = applyGravity(clearedState)

    // Process any chain reactions (blocks falling may form new words)
    // Chain words get the current streak bonus - they're part of the same successful play
    const chainResult = processBlockLocked(withGravity, {
      streakMultiplier: state.currentStreak,
    })

    if (chainResult.chainCount > 0) {
      // Chain words found! Play sounds and use helper for updates
      playWordClear()
      if (chainResult.chainCount > 1) {
        playChain(chainResult.chainCount)
      }

      // Use helper for consistent handling (stats, particles, bonus words, shake)
      const updates = buildWordResultUpdates(chainResult, state, 0)
      updates.isCelebrating = false

      // Check game over
      if (isGameOver(chainResult.state)) {
        playGameOver()
        set({
          ...updates,
          gameOver: true,
        })
        return
      }

      // Spawn next block
      // Note: nextLetter is guaranteed to be set during gameplay - it's only null
      // before startGame() is called, which the UI prevents
      const nextState = spawnBlock(chainResult.state, chainResult.state.nextLetter!)
      updates.blocks = nextState.blocks
      updates.nextLetter = nextState.nextLetter

      set(updates)
    } else {
      // No chain words - just spawn next block
      if (isGameOver(chainResult.state)) {
        playGameOver()
        set({
          ...chainResult.state,
          gameOver: true,
          isCelebrating: false,
        })
        return
      }

      // nextLetter guaranteed during gameplay (see note above)
      const nextState = spawnBlock(chainResult.state, chainResult.state.nextLetter!)
      set({
        blocks: nextState.blocks,
        nextLetter: nextState.nextLetter,
        score: chainResult.state.score,
        wordsFound: chainResult.state.wordsFound,
        isCelebrating: false,
      })
    }
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

  clearBonusWordMatched: () => {
    set({ bonusWordMatched: false })
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
    // createInitialState() always calls generateLetter() which always returns a string
    // The ! is safe because generateLetter() never returns null
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
    const droppedState = hardDrop(state)

    // Play block land sound
    playBlockLand()

    // Calculate streak multiplier
    const streakMultiplier = state.currentStreak + 1

    // Phase 1: Detect words and mark blocks as celebrating (don't remove yet)
    const wordResult = detectAndMarkWords(droppedState, { streakMultiplier })

    // Words found this round (repeated words are valid and treated the same)
    const wordsFoundThisRound = wordResult.wordsFound.slice(state.wordsFound.length)
    const scoreGained = wordResult.score - state.score

    if (wordsFoundThisRound.length > 0) {
      // Words found! Keep blocks glowing, don't spawn next block yet
      // Play sounds for word clear
      playWordClear()
      if (wordResult.chainCount > 1) {
        playChain(wordResult.chainCount)
      }

      // Update streak
      const newStreak = state.currentStreak + 1

      // Play streak sound for consecutive finds
      if (newStreak > 1) {
        playStreakContinue(newStreak)
      }

      // Handle bonus word match
      const updates: Partial<GameStore> = {
        blocks: wordResult.blocks, // Blocks with isCelebrating: true
        score: wordResult.score,
        wordsFound: wordResult.wordsFound,
        currentStreak: newStreak,
        streakBroken: false,
      }

      if (wordResult.bonusWordMatched && state.currentBonusWord) {
        updates.bonusWordsFound = [...state.bonusWordsFound, state.currentBonusWord]
        updates.currentBonusWord = getRandomBonusWord()
        updates.bonusWordMatched = true
      }

      // Update stats
      const currentStats = state.stats

      // Calculate individual word scores for all words this round
      const wordsWithScores: WordWithScore[] = wordsFoundThisRound.map(word => {
        const isBonus = isBonusWordMatch(word, state.currentBonusWord)
        return {
          word,
          score: calculateWordScore(word, {
            chainMultiplier: wordResult.chainCount,
            streakMultiplier: newStreak,
            bonusMultiplier: isBonus ? BONUS_WORD_MULTIPLIER : 1,
          }),
          streakMultiplier: newStreak > 1 ? newStreak : undefined,
          chainMultiplier: wordResult.chainCount > 1 ? wordResult.chainCount : undefined,
          isBonus: isBonus || undefined,
        }
      })

      updates.lastFoundWord = {
        word: wordsFoundThisRound.join(', '),
        score: scoreGained,
        id: ++wordEventId,
        chainCount: wordResult.chainCount,
        streakCount: newStreak,
        bonusWordMatched: wordResult.bonusWordMatched,
      }
      updates.isCelebrating = true

      const longestThisRound = wordsFoundThisRound.reduce((a, b) => a.length > b.length ? a : b, '')
      const newLongest = longestThisRound.length > currentStats.longestWord.length ? longestThisRound : currentStats.longestWord
      const newBestChain = Math.max(currentStats.bestChain, wordResult.chainCount)
      const newBestStreak = Math.max(currentStats.bestStreak, newStreak)

      updates.stats = {
        longestWord: newLongest,
        bestChain: newBestChain,
        totalWordsFound: currentStats.totalWordsFound + wordsFoundThisRound.length,
        bestStreak: newBestStreak,
        wordHistory: [...currentStats.wordHistory, ...wordsWithScores],
      }

      // Trigger particles at cleared positions (will animate alongside glowing blocks)
      if (wordResult.clearedPositions.length > 0) {
        updates.particleEvent = {
          id: wordEventId,
          positions: wordResult.clearedPositions,
        }
      }

      // Trigger screen shake on word finds
      updates.isShaking = true

      set(updates)
    } else {
      // No words found immediately - apply gravity and check for gravity-formed words
      const withGravity = applyGravity(droppedState)
      const gravityResult = processBlockLocked(withGravity, { streakMultiplier: 1 })

      if (gravityResult.chainCount > 0) {
        // Words formed by gravity! Use helper to build updates
        playWordClear()
        if (gravityResult.chainCount > 1) {
          playChain(gravityResult.chainCount)
        }

        // Get updates from helper (stats, particles, bonus word, etc.)
        const updates = buildWordResultUpdates(gravityResult, state, 0)

        // Gravity words don't continue streaks
        updates.currentStreak = 0
        if (state.currentStreak > 0) {
          updates.streakBroken = true
        }

        // Check game over after gravity chain
        if (isGameOver(gravityResult.state)) {
          playGameOver()
          set({
            ...updates,
            gameOver: true,
          })
          return
        }

        // Spawn next block (nextLetter guaranteed during gameplay)
        const nextState = spawnBlock(gravityResult.state, gravityResult.state.nextLetter!)
        updates.blocks = nextState.blocks
        updates.nextLetter = nextState.nextLetter

        set(updates)
      } else {
        // Truly no words - check game over and spawn next block
        if (isGameOver(withGravity)) {
          playGameOver()
          set({
            ...withGravity,
            gameOver: true,
          })
          return
        }

        // Spawn next block (nextLetter guaranteed during gameplay)
        const nextState = spawnBlock(withGravity, withGravity.nextLetter!)

        const updates: Partial<GameStore> = {
          blocks: nextState.blocks,
          nextLetter: nextState.nextLetter,
        }

        // Break streak if we had one
        if (state.currentStreak > 0) {
          playStreakBroken()
          updates.currentStreak = 0
          updates.streakBroken = true
        }

        set(updates)
      }
    }
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

      // Calculate streak multiplier
      const streakMultiplier = state.currentStreak + 1

      // Phase 1: Detect words and mark blocks as celebrating (don't remove yet)
      const wordResult = detectAndMarkWords(newState, { streakMultiplier })

      // Words found this round (repeated words are valid and treated the same)
      const wordsFoundThisRound = wordResult.wordsFound.slice(state.wordsFound.length)
      const scoreGained = wordResult.score - state.score

      if (wordsFoundThisRound.length > 0) {
        // Words found! Keep blocks glowing, don't spawn next block yet
        // Play sounds for word clear and chains
        playWordClear()
        if (wordResult.chainCount > 1) {
          playChain(wordResult.chainCount)
        }

        // Update streak
        const newStreak = state.currentStreak + 1

        // Play streak sound for consecutive finds
        if (newStreak > 1) {
          playStreakContinue(newStreak)
        }

        // Handle bonus word match
        const updates: Partial<GameStore> = {
          blocks: wordResult.blocks, // Blocks with isCelebrating: true
          score: wordResult.score,
          wordsFound: wordResult.wordsFound,
          currentStreak: newStreak,
          streakBroken: false,
        }

        if (wordResult.bonusWordMatched && state.currentBonusWord) {
          updates.bonusWordsFound = [...state.bonusWordsFound, state.currentBonusWord]
          updates.currentBonusWord = getRandomBonusWord()
          updates.bonusWordMatched = true
        }

        // Update stats
        const currentStats = state.stats

        // Calculate individual word scores for all words this round
        const wordsWithScores: WordWithScore[] = wordsFoundThisRound.map(word => {
          const isBonus = isBonusWordMatch(word, state.currentBonusWord)
          return {
            word,
            score: calculateWordScore(word, {
              chainMultiplier: wordResult.chainCount,
              streakMultiplier: newStreak,
              bonusMultiplier: isBonus ? BONUS_WORD_MULTIPLIER : 1,
            }),
            streakMultiplier: newStreak > 1 ? newStreak : undefined,
            chainMultiplier: wordResult.chainCount > 1 ? wordResult.chainCount : undefined,
            isBonus: isBonus || undefined,
          }
        })

        updates.lastFoundWord = {
          word: wordsFoundThisRound.join(', '),
          score: scoreGained,
          id: ++wordEventId,
          chainCount: wordResult.chainCount,
          streakCount: newStreak,
          bonusWordMatched: wordResult.bonusWordMatched,
        }
        updates.isCelebrating = true

        const longestThisRound = wordsFoundThisRound.reduce((a, b) => a.length > b.length ? a : b, '')
        const newLongest = longestThisRound.length > currentStats.longestWord.length ? longestThisRound : currentStats.longestWord
        const newBestChain = Math.max(currentStats.bestChain, wordResult.chainCount)
        const newBestStreak = Math.max(currentStats.bestStreak, newStreak)

        updates.stats = {
          longestWord: newLongest,
          bestChain: newBestChain,
          totalWordsFound: currentStats.totalWordsFound + wordsFoundThisRound.length,
          bestStreak: newBestStreak,
          wordHistory: [...currentStats.wordHistory, ...wordsWithScores],
        }

        // Trigger particles at cleared positions (will animate alongside glowing blocks)
        if (wordResult.clearedPositions.length > 0) {
          updates.particleEvent = {
            id: wordEventId,
            positions: wordResult.clearedPositions,
          }
        }

        // Trigger screen shake on word finds
        updates.isShaking = true

        set(updates)
      } else {
        // No words found immediately - apply gravity and check for gravity-formed words
        const withGravity = applyGravity(newState)
        const gravityResult = processBlockLocked(withGravity, { streakMultiplier: 1 })

        if (gravityResult.chainCount > 0) {
          // Words formed by gravity! Use helper to build updates
          playWordClear()
          if (gravityResult.chainCount > 1) {
            playChain(gravityResult.chainCount)
          }

          // Get updates from helper (stats, particles, bonus word, etc.)
          const updates = buildWordResultUpdates(gravityResult, state, 0)

          // Gravity words don't continue streaks
          updates.currentStreak = 0
          if (state.currentStreak > 0) {
            updates.streakBroken = true
          }

          // Check game over after gravity chain
          if (isGameOver(gravityResult.state)) {
            playGameOver()
            set({
              ...updates,
              gameOver: true,
            })
            return
          }

          // Spawn next block
          const nextState = spawnBlock(gravityResult.state, gravityResult.state.nextLetter!)
          updates.blocks = nextState.blocks
          updates.nextLetter = nextState.nextLetter

          set(updates)
        } else {
          // Truly no words - check game over and spawn next block
          if (isGameOver(withGravity)) {
            playGameOver()
            set({
              ...withGravity,
              gameOver: true,
            })
            return
          }

          // Spawn next block
          const nextState = spawnBlock(withGravity, withGravity.nextLetter!)

          const updates: Partial<GameStore> = {
            blocks: nextState.blocks,
            nextLetter: nextState.nextLetter,
          }

          // Break streak if we had one
          if (state.currentStreak > 0) {
            playStreakBroken()
            updates.currentStreak = 0
            updates.streakBroken = true
          }

          set(updates)
        }
      }
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
      currentBonusWord: null,
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
      bonusWordMatched: false,
    })
  },
}))
