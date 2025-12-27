import { FOUR_LETTER_WORDS } from '../dictionary'

const fourLetterWordsArray = Array.from(FOUR_LETTER_WORDS)

export const BONUS_WORD_MULTIPLIER = 3

/**
 * Get a random 4-letter bonus word from the dictionary
 */
export function getRandomBonusWord(): string {
  const index = Math.floor(Math.random() * fourLetterWordsArray.length)
  return fourLetterWordsArray[index]
}

/**
 * Get a seeded random bonus word for daily mode
 */
export function getSeededBonusWord(seed: number): string {
  const index = Math.floor((seed * 9301 + 49297) % 233280 / 233280 * fourLetterWordsArray.length)
  return fourLetterWordsArray[index]
}

/**
 * Check if a found word matches the bonus word
 */
export function isBonusWordMatch(word: string, bonusWord: string | null): boolean {
  if (!bonusWord) return false
  return word.toUpperCase() === bonusWord.toUpperCase()
}
