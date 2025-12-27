import { LETTER_POINTS } from '../constants'

export interface ScoreOptions {
  chainMultiplier?: number
  streakMultiplier?: number
  bonusMultiplier?: number
}

/**
 * Calculate the score for a single letter
 */
export function calculateLetterScore(letter: string): number {
  return LETTER_POINTS[letter.toUpperCase()] || 1
}

/**
 * Calculate the score for a word
 * Score = sum of letter values * chain * streak * bonus
 */
export function calculateWordScore(word: string, options: ScoreOptions | number = {}): number {
  // Support legacy number argument for backwards compatibility
  const opts: ScoreOptions = typeof options === 'number'
    ? { chainMultiplier: options }
    : options

  const chainMultiplier = opts.chainMultiplier ?? 1
  const streakMultiplier = opts.streakMultiplier ?? 1
  const bonusMultiplier = opts.bonusMultiplier ?? 1

  // Base score: sum of letter values
  let baseScore = 0
  for (const letter of word.toUpperCase()) {
    baseScore += calculateLetterScore(letter)
  }

  // Apply all multipliers
  const score = baseScore * chainMultiplier * streakMultiplier * bonusMultiplier

  return Math.round(score)
}

/**
 * Calculate total score for multiple words with their multipliers
 */
export function calculateTotalScore(words: string[], multipliers: number[]): number {
  let total = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const multiplier = multipliers[i] || 1
    total += calculateWordScore(word, multiplier)
  }

  return total
}
