import { GameState, ChainResult, ClearedPosition } from '../types'
import { applyGravity } from './grid'
import { findWords, clearWords } from './words'
import { calculateWordScore } from './scoring'

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

/**
 * Process chain reactions until no more words form
 *
 * Returns the final state with all words cleared and score calculated
 * @param state - Current game state
 * @param streakMultiplier - Multiplier based on current streak (1 = no bonus, 2 = 2x, etc.)
 */
export function processChainReaction(state: GameState, streakMultiplier: number = 1): ChainResult {
  let currentState = { ...state }
  let chainCount = 0
  const allWordsFound: string[] = []
  const chainMultipliers: number[] = []
  const allClearedPositions: ClearedPosition[] = []
  let totalScore = 0

  // Keep checking for words and clearing them
  while (true) {
    const words = findWords(currentState.blocks)

    if (words.length === 0) {
      break
    }

    chainCount++
    const multiplier = chainCount

    // Calculate score for all words at this chain level
    const uniqueWords = new Map<string, typeof words[0]>()
    words.forEach(w => {
      const key = w.word + w.blocks.map(b => `${b.x},${b.y}`).join('|')
      if (!uniqueWords.has(key)) {
        uniqueWords.set(key, w)
      }
    })

    uniqueWords.forEach(word => {
      const score = calculateWordScore(word.word, {
        chainMultiplier: multiplier,
        isRare: word.isRare,
        streakMultiplier,
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

    chainMultipliers.push(multiplier)

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
  }
}
