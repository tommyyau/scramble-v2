import { FIVE_LETTER_WORDS } from '../dictionary/words'

// Convert Set to Array for random selection
const fiveLetterWordsArray = Array.from(FIVE_LETTER_WORDS)

/**
 * Get a random 5-letter bonus word from the dictionary
 */
export function getRandomBonusWord(): string {
  const index = Math.floor(Math.random() * fiveLetterWordsArray.length)
  return fiveLetterWordsArray[index]
}

/**
 * Check if a word matches the current bonus word
 */
export function isBonusWordMatch(word: string, bonusWord: string | null): boolean {
  if (!bonusWord) return false
  return word.toUpperCase() === bonusWord.toUpperCase()
}

/**
 * Bonus word multiplier (3x)
 */
export const BONUS_WORD_MULTIPLIER = 3
