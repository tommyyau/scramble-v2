import { GameState, ClearedPosition, WordWithScore } from '../types'
import { applyGravity } from './grid'
import { findWords, clearWords } from './words'
import { calculateWordScore } from './scoring'
import { isBonusWordMatch, BONUS_WORD_MULTIPLIER } from './bonus-word'

// Block color mapping for particles (same as chains.ts)
const blockColors: Record<string, string> = {
  A: '#FF6B6B', E: '#FFE66D', I: '#FF9FF3', O: '#FFA07A', U: '#FFB347',
  R: '#4ECDC4', S: '#4ECDC4', T: '#4ECDC4', L: '#4ECDC4', N: '#4ECDC4',
  Q: '#A66CFF', X: '#A66CFF', Z: '#A66CFF', J: '#A66CFF', K: '#A66CFF',
}
const defaultBlockColor = '#48DBFB'

function getBlockColor(letter: string): string {
  return blockColors[letter] || defaultBlockColor
}

export interface BlockLockedOptions {
  streakMultiplier: number
}

export interface BlockLockedResult {
  /** Updated game state with cleared blocks removed and gravity applied */
  state: GameState
  /** List of words found (including chain words) */
  wordsFound: string[]
  /** Total score gained from this block lock */
  score: number
  /** Number of chain levels (1 = initial word, 2+ = gravity chains) */
  chainCount: number
  /** Multiplier used at each chain level */
  chainMultipliers: number[]
  /** Whether any word matched the current bonus word */
  bonusWordMatched: boolean
  /** Positions of cleared blocks for particle effects */
  clearedPositions: ClearedPosition[]
  /** Words with their individual scores and multipliers for history */
  wordsWithScores: WordWithScore[]
}

/**
 * Process what happens after a block locks.
 *
 * This unified function handles:
 * 1. Word detection in current grid
 * 2. Clearing found words
 * 3. Applying gravity
 * 4. Detecting chain reactions (gravity-formed words)
 * 5. Calculating scores with multipliers
 *
 * Used by drop(), gameTick(), and endCelebration() to avoid code duplication.
 */
export function processBlockLocked(
  state: GameState,
  options: BlockLockedOptions
): BlockLockedResult {
  const { streakMultiplier } = options

  let currentState = { ...state }
  let chainCount = 0
  const allWordsFound: string[] = []
  const chainMultipliers: number[] = []
  const allClearedPositions: ClearedPosition[] = []
  const allWordsWithScores: WordWithScore[] = []
  let totalScore = 0
  let bonusWordMatched = false

  // Keep processing until no more words are found
  while (true) {
    const words = findWords(currentState.blocks)

    if (words.length === 0) {
      break
    }

    chainCount++
    const chainMultiplier = chainCount

    // Deduplicate words (same word at same position)
    const uniqueWords = new Map<string, typeof words[0]>()
    words.forEach(w => {
      const key = w.word + w.blocks.map(b => `${b.x},${b.y}`).join('|')
      if (!uniqueWords.has(key)) {
        uniqueWords.set(key, w)
      }
    })

    // Process each word
    uniqueWords.forEach(word => {
      // Check bonus word match
      const isBonusMatch = isBonusWordMatch(word.word, currentState.currentBonusWord)
      if (isBonusMatch) {
        bonusWordMatched = true
      }

      // Calculate score
      const wordScore = calculateWordScore(word.word, {
        chainMultiplier,
        streakMultiplier,
        bonusMultiplier: isBonusMatch ? BONUS_WORD_MULTIPLIER : 1,
      })
      totalScore += wordScore

      // Track word if not already found
      if (!allWordsFound.includes(word.word)) {
        allWordsFound.push(word.word)
      }

      // Add to history with multipliers
      allWordsWithScores.push({
        word: word.word,
        score: wordScore,
        streakMultiplier: streakMultiplier > 1 ? streakMultiplier : undefined,
        chainMultiplier: chainMultiplier > 1 ? chainMultiplier : undefined,
        isBonus: isBonusMatch || undefined,
      })

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

  // Update state with results
  const finalState: GameState = {
    ...currentState,
    score: currentState.score + totalScore,
    wordsFound: [...currentState.wordsFound, ...allWordsFound.filter(w => !currentState.wordsFound.includes(w))],
  }

  return {
    state: finalState,
    wordsFound: allWordsFound,
    score: totalScore,
    chainCount,
    chainMultipliers,
    bonusWordMatched,
    clearedPositions: allClearedPositions,
    wordsWithScores: allWordsWithScores,
  }
}
