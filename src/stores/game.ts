import { create } from 'zustand'
import { GameState, GameMode, ClearedPosition } from '../lib/types'
import { createInitialState, spawnBlock, tick, isGameOver } from '../lib/engine/core'
import { moveBlock, hardDrop, applyGravity } from '../lib/engine/grid'
import { detectAndMarkWords, clearCelebratingBlocks, processChainReaction } from '../lib/engine/chains'
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

export interface WordWithScore {
  word: string
  score: number
  streakMultiplier?: number  // 2x, 3x, etc for consecutive finds
  chainMultiplier?: number   // 2x, 3x, etc for gravity chains
  isBonus?: boolean          // Was this the bonus word
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
    let newState = clearCelebratingBlocks(state)

    // Process any chain reactions that happen after gravity
    // (blocks falling may form new words)
    const chainResult = processChainReaction(newState, {
      streakMultiplier: state.currentStreak,
    })

    // Apply gravity after chains
    newState = applyGravity(chainResult)

    // Add chain words to history with their multipliers
    const chainWordsForHistory: WordWithScore[] = chainResult.chainWordsWithScores.map(w => ({
      word: w.word,
      score: w.score,
      streakMultiplier: w.streakMultiplier > 1 ? w.streakMultiplier : undefined,
      chainMultiplier: w.chainMultiplier > 1 ? w.chainMultiplier : undefined,
      isBonus: w.isBonus || undefined,
    }))

    // Update stats with chain words
    const updatedStats = chainWordsForHistory.length > 0
      ? {
          ...state.stats,
          totalWordsFound: state.stats.totalWordsFound + chainWordsForHistory.length,
          bestChain: Math.max(state.stats.bestChain, chainResult.chainCount),
          wordHistory: [...state.stats.wordHistory, ...chainWordsForHistory],
        }
      : state.stats

    // Check game over
    if (isGameOver(newState)) {
      playGameOver()
      set({
        ...newState,
        gameOver: true,
        isCelebrating: false,
        stats: updatedStats,
      })
      return
    }

    // Spawn next block
    const nextState = spawnBlock(newState, newState.nextLetter!)

    set({
      blocks: nextState.blocks,
      nextLetter: nextState.nextLetter,
      score: chainResult.score,
      wordsFound: chainResult.wordsFound,
      isCelebrating: false,
      stats: updatedStats,
    })
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
    console.log('Initial state bonus word:', initialState.currentBonusWord)
    const stateWithBlock = spawnBlock(initialState, initialState.nextLetter!)
    console.log('After spawn bonus word:', stateWithBlock.currentBonusWord)
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

    // Check for new words found
    const newWords = wordResult.wordsFound.filter(
      w => !state.wordsFound.includes(w)
    )
    const scoreGained = wordResult.score - state.score

    if (newWords.length > 0) {
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
      const longestNew = newWords.reduce((a, b) => a.length > b.length ? a : b, '')
      const newLongest = longestNew.length > currentStats.longestWord.length ? longestNew : currentStats.longestWord
      const newBestChain = Math.max(currentStats.bestChain, wordResult.chainCount)
      const newBestStreak = Math.max(currentStats.bestStreak, newStreak)

      // Calculate individual word scores for history (including bonus if matched)
      const newWordsWithScores: WordWithScore[] = newWords.map(word => {
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
        word: newWords.join(', '),
        score: scoreGained,
        id: ++wordEventId,
        chainCount: wordResult.chainCount,
        streakCount: newStreak,
        bonusWordMatched: wordResult.bonusWordMatched,
      }
      updates.isCelebrating = true
      updates.stats = {
        longestWord: newLongest,
        bestChain: newBestChain,
        totalWordsFound: currentStats.totalWordsFound + newWords.length,
        bestStreak: newBestStreak,
        wordHistory: [...currentStats.wordHistory, ...newWordsWithScores],
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
      let newState = applyGravity(droppedState)

      // Check if gravity caused blocks to form words
      const gravityResult = processChainReaction(newState, { streakMultiplier: 1 })

      if (gravityResult.chainCount > 0) {
        // Words formed by gravity! Handle celebration
        const gravityWords = gravityResult.wordsFound.filter(
          w => !state.wordsFound.includes(w)
        )
        const scoreGained = gravityResult.score - state.score

        playWordClear()
        if (gravityResult.chainCount > 1) {
          playChain(gravityResult.chainCount)
        }

        // Handle bonus word match
        const updates: Partial<GameStore> = {
          blocks: gravityResult.blocks,
          score: gravityResult.score,
          wordsFound: gravityResult.wordsFound,
          currentStreak: 0, // Gravity words don't continue streaks
          streakBroken: state.currentStreak > 0,
        }

        if (gravityResult.bonusWordMatched && state.currentBonusWord) {
          updates.bonusWordsFound = [...state.bonusWordsFound, state.currentBonusWord]
          updates.currentBonusWord = getRandomBonusWord()
          updates.bonusWordMatched = true
        }

        // Update stats
        const currentStats = state.stats
        const longestNew = gravityWords.length > 0
          ? gravityWords.reduce((a, b) => a.length > b.length ? a : b, '')
          : ''
        const newLongest = longestNew.length > currentStats.longestWord.length ? longestNew : currentStats.longestWord
        const newBestChain = Math.max(currentStats.bestChain, gravityResult.chainCount)

        // Add gravity words to history with chain multipliers
        const gravityWordsWithScores: WordWithScore[] = gravityResult.chainWordsWithScores.map(w => ({
          word: w.word,
          score: w.score,
          chainMultiplier: w.chainMultiplier > 1 ? w.chainMultiplier : undefined,
          isBonus: w.isBonus || undefined,
        }))

        updates.lastFoundWord = {
          word: gravityWords.join(', '),
          score: scoreGained,
          id: ++wordEventId,
          chainCount: gravityResult.chainCount,
          streakCount: 0,
          bonusWordMatched: gravityResult.bonusWordMatched,
        }
        updates.stats = {
          longestWord: newLongest,
          bestChain: newBestChain,
          totalWordsFound: currentStats.totalWordsFound + gravityWords.length,
          bestStreak: currentStats.bestStreak,
          wordHistory: [...currentStats.wordHistory, ...gravityWordsWithScores],
        }

        // Trigger particles and shake
        if (gravityResult.clearedPositions.length > 0) {
          updates.particleEvent = {
            id: wordEventId,
            positions: gravityResult.clearedPositions,
          }
        }
        updates.isShaking = true

        // Check game over after gravity chain
        if (isGameOver(gravityResult)) {
          playGameOver()
          set({
            ...updates,
            gameOver: true,
          })
          return
        }

        // Spawn next block
        const nextState = spawnBlock(gravityResult, gravityResult.nextLetter!)
        updates.blocks = nextState.blocks
        updates.nextLetter = nextState.nextLetter

        set(updates)
      } else {
        // Truly no words - check game over and spawn next block
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

      // Check for new words found
      const newWords = wordResult.wordsFound.filter(
        w => !state.wordsFound.includes(w)
      )
      const scoreGained = wordResult.score - state.score

      if (newWords.length > 0) {
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
        const longestNew = newWords.reduce((a, b) => a.length > b.length ? a : b, '')
        const newLongest = longestNew.length > currentStats.longestWord.length ? longestNew : currentStats.longestWord
        const newBestChain = Math.max(currentStats.bestChain, wordResult.chainCount)
        const newBestStreak = Math.max(currentStats.bestStreak, newStreak)

        // Calculate individual word scores for history (including bonus if matched)
        const newWordsWithScores: WordWithScore[] = newWords.map(word => {
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
          word: newWords.join(', '),
          score: scoreGained,
          id: ++wordEventId,
          chainCount: wordResult.chainCount,
          streakCount: newStreak,
          bonusWordMatched: wordResult.bonusWordMatched,
        }
        updates.isCelebrating = true
        updates.stats = {
          longestWord: newLongest,
          bestChain: newBestChain,
          totalWordsFound: currentStats.totalWordsFound + newWords.length,
          bestStreak: newBestStreak,
          wordHistory: [...currentStats.wordHistory, ...newWordsWithScores],
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
        newState = applyGravity(newState)

        // Check if gravity caused blocks to form words
        const gravityResult = processChainReaction(newState, { streakMultiplier: 1 })

        if (gravityResult.chainCount > 0) {
          // Words formed by gravity! Handle celebration
          const gravityWords = gravityResult.wordsFound.filter(
            w => !state.wordsFound.includes(w)
          )
          const scoreGained = gravityResult.score - state.score

          playWordClear()
          if (gravityResult.chainCount > 1) {
            playChain(gravityResult.chainCount)
          }

          // Handle bonus word match
          const updates: Partial<GameStore> = {
            blocks: gravityResult.blocks,
            score: gravityResult.score,
            wordsFound: gravityResult.wordsFound,
            currentStreak: 0, // Gravity words don't continue streaks
            streakBroken: state.currentStreak > 0,
          }

          if (gravityResult.bonusWordMatched && state.currentBonusWord) {
            updates.bonusWordsFound = [...state.bonusWordsFound, state.currentBonusWord]
            updates.currentBonusWord = getRandomBonusWord()
            updates.bonusWordMatched = true
          }

          // Update stats
          const currentStats = state.stats
          const longestNew = gravityWords.length > 0
            ? gravityWords.reduce((a, b) => a.length > b.length ? a : b, '')
            : ''
          const newLongest = longestNew.length > currentStats.longestWord.length ? longestNew : currentStats.longestWord
          const newBestChain = Math.max(currentStats.bestChain, gravityResult.chainCount)

          // Add gravity words to history with chain multipliers
          const gravityWordsWithScores: WordWithScore[] = gravityResult.chainWordsWithScores.map(w => ({
            word: w.word,
            score: w.score,
            chainMultiplier: w.chainMultiplier > 1 ? w.chainMultiplier : undefined,
            isBonus: w.isBonus || undefined,
          }))

          updates.lastFoundWord = {
            word: gravityWords.join(', '),
            score: scoreGained,
            id: ++wordEventId,
            chainCount: gravityResult.chainCount,
            streakCount: 0,
            bonusWordMatched: gravityResult.bonusWordMatched,
          }
          updates.stats = {
            longestWord: newLongest,
            bestChain: newBestChain,
            totalWordsFound: currentStats.totalWordsFound + gravityWords.length,
            bestStreak: currentStats.bestStreak,
            wordHistory: [...currentStats.wordHistory, ...gravityWordsWithScores],
          }

          // Trigger particles and shake
          if (gravityResult.clearedPositions.length > 0) {
            updates.particleEvent = {
              id: wordEventId,
              positions: gravityResult.clearedPositions,
            }
          }
          updates.isShaking = true

          // Check game over after gravity chain
          if (isGameOver(gravityResult)) {
            playGameOver()
            set({
              ...updates,
              gameOver: true,
            })
            return
          }

          // Spawn next block
          const nextState = spawnBlock(gravityResult, gravityResult.nextLetter!)
          updates.blocks = nextState.blocks
          updates.nextLetter = nextState.nextLetter

          set(updates)
        } else {
          // Truly no words - check game over and spawn next block
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
