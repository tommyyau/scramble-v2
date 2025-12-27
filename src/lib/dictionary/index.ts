// Word dictionary for Scramble v2
// Words are stored in separate JSON files to prevent AI truncation during code edits
// Only 3-6 letter words are supported in the game

import threeLetterWords from './three-letter.json'
import fourLetterWords from './four-letter.json'
import fiveLetterWords from './five-letter.json'
import sixLetterWords from './six-letter.json'

export const THREE_LETTER_WORDS = new Set(threeLetterWords)
export const FOUR_LETTER_WORDS = new Set(fourLetterWords)
export const FIVE_LETTER_WORDS = new Set(fiveLetterWords)
export const SIX_LETTER_WORDS = new Set(sixLetterWords)

// Combined dictionary for quick lookup
export const ALL_WORDS = new Set([
  ...THREE_LETTER_WORDS,
  ...FOUR_LETTER_WORDS,
  ...FIVE_LETTER_WORDS,
  ...SIX_LETTER_WORDS,
])

// Check if a word is valid
export function isValidWord(word: string): boolean {
  return ALL_WORDS.has(word.toUpperCase())
}
