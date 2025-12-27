// Word dictionary for Scramble v2
// Data stored in words.json to prevent accidental modification
// This file creates typed Sets from the JSON arrays

import wordData from './words.json'

export const THREE_LETTER_WORDS = new Set<string>(wordData.threeLetterWords)
export const FOUR_LETTER_WORDS = new Set<string>(wordData.fourLetterWords)
export const FIVE_LETTER_WORDS = new Set<string>(wordData.fiveLetterWords)
export const SIX_LETTER_WORDS = new Set<string>(wordData.sixLetterWords)

// Combined set of all valid words
export const ALL_WORDS = new Set<string>([
  ...wordData.threeLetterWords,
  ...wordData.fourLetterWords,
  ...wordData.fiveLetterWords,
  ...wordData.sixLetterWords,
])

// Check if a word is valid (in the dictionary)
export function isValidWord(word: string): boolean {
  return ALL_WORDS.has(word.toUpperCase())
}
