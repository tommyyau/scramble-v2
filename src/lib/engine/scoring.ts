import { LETTER_POINTS } from '../constants'

/**
 * Calculate the score for a single letter
 */
export function calculateLetterScore(letter: string): number {
  return LETTER_POINTS[letter.toUpperCase()] || 1
}

/**
 * Calculate the score for a word
 * Score = sum of letter values * chain multiplier
 */
export function calculateWordScore(word: string, chainMultiplier: number): number {
  // Base score: sum of letter values
  let baseScore = 0
  for (const letter of word.toUpperCase()) {
    baseScore += calculateLetterScore(letter)
  }

  // Apply chain multiplier
  const score = baseScore * chainMultiplier

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
