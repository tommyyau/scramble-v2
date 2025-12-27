import { GameState, ChainResult, ClearedPosition } from '../types'
import { applyGravity } from './grid'
import { findWords, clearWords } from './words'
import { calculateWordScore } from './scoring'
import { isBonusWordMatch, BONUS_WORD_MULTIPLIER } from './bonus-word'

// Block color mapping for particles
const blockColors: Record<string, string> = {
  A: '#FF6B6B', E: '#FFE66D', I: '#FF9FF3', O: '#FFA07A', U: '#FFB347',
  R: '#4ECDC4', S: '#4ECDC4', T: '#4ECDC4', L: '#4ECDC4', N: '#4ECDC4',
  Q: '#A66CFF', X: '#A66CFF', Z: '#A66CFF', J: '#A66CFF', K: '#A66CFF',
}
const defaultBlockColor = '#48DBFB'

function getBlockColor(letter: string): string {
  return blockColors[letter] || defaultBlockColor
}

/**
 * Detect if new words formed after gravity
 */
export function detectChain(state: GameState): boolean {
  const words = findWords(state.blocks)
  return words.length > 0
}

export interface ChainReactionOptions {
  streakMultiplier?: number
}

/**
 * Result from detecting and marking words (Phase 1 - before clearing)
 */
export interface WordDetectionResult extends GameState {
  wordsFound: string[]
  score: number
  chainCount: number
  chainMultipliers: number[]
  clearedPositions: ClearedPosition[]
  bonusWordMatched: boolean
  hasCelebratingBlocks: boolean
}

/**
 * Phase 1: Detect words and mark their blocks as celebrating
 * Blocks stay in the grid with isCelebrating: true for visual effect
 */
export function detectAndMarkWords(state: GameState, options: ChainReactionOptions = {}): WordDetectionResult {
  const streakMultiplier = options.streakMultiplier ?? 1

  const words = findWords(state.blocks)

  if (words.length === 0) {
    return {
      ...state,
      chainCount: 0,
      chainMultipliers: [],
      clearedPositions: [],
      bonusWordMatched: false,
      hasCelebratingBlocks: false,
    }
  }

  // Calculate score and collect word info
  const uniqueWords = new Map<string, typeof words[0]>()
  words.forEach(w => {
    const key = w.word + w.blocks.map(b => `${b.x},${b.y}`).join('|')
    if (!uniqueWords.has(key)) {
      uniqueWords.set(key, w)
    }
  })

  const allWordsFound: string[] = []
  const allClearedPositions: ClearedPosition[] = []
  let totalScore = 0
  let bonusWordMatched = false
  const chainMultiplier = 1 // First chain level

  // Collect all block positions that are part of words
  const celebratingBlockIds = new Set<number>()

  uniqueWords.forEach(word => {
    const isBonusMatch = isBonusWordMatch(word.word, state.currentBonusWord)
    if (isBonusMatch) {
      bonusWordMatched = true
    }

    const score = calculateWordScore(word.word, {
      chainMultiplier,
      streakMultiplier,
      bonusMultiplier: isBonusMatch ? BONUS_WORD_MULTIPLIER : 1,
    })
    totalScore += score

    if (!allWordsFound.includes(word.word)) {
      allWordsFound.push(word.word)
    }

    // Track cleared positions for particles and mark blocks
    word.blocks.forEach(block => {
      celebratingBlockIds.add(block.id)
      allClearedPositions.push({
        x: block.x,
        y: block.y,
        color: getBlockColor(block.letter),
      })
    })
  })

  // Mark blocks as celebrating (don't remove them yet)
  const markedBlocks = state.blocks.map(block =>
    celebratingBlockIds.has(block.id)
      ? { ...block, isCelebrating: true }
      : block
  )

  return {
    ...state,
    blocks: markedBlocks,
    score: state.score + totalScore,
    wordsFound: [...state.wordsFound, ...allWordsFound],
    chainCount: 1,
    chainMultipliers: [chainMultiplier],
    clearedPositions: allClearedPositions,
    bonusWordMatched,
    hasCelebratingBlocks: true,
  }
}

/**
 * Phase 2: Clear celebrating blocks and apply gravity
 * Call this after the celebration animation is complete
 */
export function clearCelebratingBlocks(state: GameState): GameState {
  // Remove all celebrating blocks
  const remainingBlocks = state.blocks.filter(b => !b.isCelebrating)

  // Apply gravity to remaining blocks
  const withGravity = applyGravity({ ...state, blocks: remainingBlocks })

  return withGravity
}

/**
 * Process chain reactions until no more words form
 *
 * Returns the final state with all words cleared and score calculated
 */
export function processChainReaction(state: GameState, options: ChainReactionOptions = {}): ChainResult {
  const streakMultiplier = options.streakMultiplier ?? 1

  let currentState = { ...state }
  let chainCount = 0
  const allWordsFound: string[] = []
  const chainMultipliers: number[] = []
  const allClearedPositions: ClearedPosition[] = []
  let totalScore = 0
  let bonusWordMatched = false

  // Keep checking for words and clearing them
  while (true) {
    const words = findWords(currentState.blocks)

    if (words.length === 0) {
      break
    }

    chainCount++
    const chainMultiplier = chainCount

    // Calculate score for all words at this chain level
    const uniqueWords = new Map<string, typeof words[0]>()
    words.forEach(w => {
      const key = w.word + w.blocks.map(b => `${b.x},${b.y}`).join('|')
      if (!uniqueWords.has(key)) {
        uniqueWords.set(key, w)
      }
    })

    uniqueWords.forEach(word => {
      // Check if this word matches the bonus word
      const isBonusMatch = isBonusWordMatch(word.word, currentState.currentBonusWord)
      if (isBonusMatch) {
        bonusWordMatched = true
      }

      const score = calculateWordScore(word.word, {
        chainMultiplier,
        streakMultiplier,
        bonusMultiplier: isBonusMatch ? BONUS_WORD_MULTIPLIER : 1,
      })
      totalScore += score

      if (!allWordsFound.includes(word.word)) {
        allWordsFound.push(word.word)
      }

      // Track cleared positions for particles
      word.blocks.forEach(block => {
        allClearedPositions.push({
          x: block.x,
          y: block.y,
          color: getBlockColor(block.letter),
        })
      })
    })

    chainMultipliers.push(chainMultiplier)

    // Clear the words
    currentState = {
      ...currentState,
      blocks: clearWords(currentState.blocks, Array.from(uniqueWords.values())),
    }

    // Apply gravity
    currentState = applyGravity(currentState)
  }

  return {
    ...currentState,
    score: currentState.score + totalScore,
    wordsFound: [...currentState.wordsFound, ...allWordsFound],
    chainCount,
    chainMultipliers,
    clearedPositions: allClearedPositions,
    bonusWordMatched,
  }
}
