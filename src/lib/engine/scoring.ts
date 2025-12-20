import { LETTER_POINTS } from '../constants'

interface ScoreOptions {
  chainMultiplier: number
  isRare: boolean
}

/**
 * Calculate the score for a single letter
 */
export function calculateLetterScore(letter: string): number {
  return LETTER_POINTS[letter.toUpperCase()] || 1
}

/**
 * Get the length multiplier for a word
 */
export function getLengthMultiplier(length: number): number {
  switch (length) {
    case 3:
      return 1
    case 4:
      return 1.5
    case 5:
      return 2
    case 6:
      return 3
    case 7:
      return 4
    case 8:
    default:
      return length >= 8 ? 5 : 1
  }
}

/**
 * Check if a word is considered "rare" (contains rare letters)
 */
export function isRareWord(word: string): boolean {
  const rareLetters = ['Q', 'X', 'Z', 'J']
  return rareLetters.some(letter => word.toUpperCase().includes(letter))
}

/**
 * Calculate the score for a word
 */
export function calculateWordScore(word: string, options: ScoreOptions): number {
  const { chainMultiplier, isRare } = options

  // Base score: sum of letter values
  let baseScore = 0
  for (const letter of word.toUpperCase()) {
    baseScore += calculateLetterScore(letter)
  }

  // Apply length multiplier
  const lengthMultiplier = getLengthMultiplier(word.length)
  let score = baseScore * lengthMultiplier

  // Apply chain multiplier
  score *= chainMultiplier

  // Apply rare word bonus
  if (isRare) {
    score *= 1.5
  }

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
    const rare = isRareWord(word)

    total += calculateWordScore(word, {
      chainMultiplier: multiplier,
      isRare: rare,
    })
  }

  return total
}
