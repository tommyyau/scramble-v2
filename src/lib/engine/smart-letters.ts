import { Block } from '../types'
import { SCRABBLE_WEIGHTS, GRID_WIDTH, GRID_HEIGHT, MIN_WORD_LENGTH } from '../constants'
import { isValidWord } from '../dictionary/words'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const VOWELS = ['A', 'E', 'I', 'O', 'U']

/**
 * Get a random letter weighted by Scrabble distribution
 */
export function getRandomWeightedLetter(): string {
  const totalWeight = Object.values(SCRABBLE_WEIGHTS).reduce((a, b) => a + b, 0)
  let random = Math.random() * totalWeight

  for (const letter of ALPHABET) {
    random -= SCRABBLE_WEIGHTS[letter]
    if (random <= 0) {
      return letter
    }
  }

  return 'E' // Fallback to most common letter
}

/**
 * Count how many possible words can be formed with current grid
 * This is a simplified heuristic - checks common patterns
 */
export function countPossibleWords(blocks: Block[]): number {
  const lockedBlocks = blocks.filter(b => b.locked)
  if (lockedBlocks.length < 2) return 0

  let count = 0

  // Check each row for potential words
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const rowBlocks = lockedBlocks.filter(b => b.y === y).sort((a, b) => a.x - b.x)
    if (rowBlocks.length < 2) continue

    // Look for adjacent pairs/triples that could form words
    for (let i = 0; i < rowBlocks.length - 1; i++) {
      if (rowBlocks[i + 1].x === rowBlocks[i].x + 1) {
        // Found adjacent pair, check if any letter could complete a word
        const pair = rowBlocks[i].letter + rowBlocks[i + 1].letter
        for (const letter of ALPHABET) {
          // Check if adding letter before, after, or in between forms word
          if (isValidWord(letter + pair) || isValidWord(pair + letter)) {
            count++
            break
          }
        }
      }
    }
  }

  // Check each column for potential words
  for (let x = 0; x < GRID_WIDTH; x++) {
    const colBlocks = lockedBlocks.filter(b => b.x === x).sort((a, b) => a.y - b.y)
    if (colBlocks.length < 2) continue

    for (let i = 0; i < colBlocks.length - 1; i++) {
      if (colBlocks[i + 1].y === colBlocks[i].y + 1) {
        const pair = colBlocks[i].letter + colBlocks[i + 1].letter
        for (const letter of ALPHABET) {
          if (isValidWord(letter + pair) || isValidWord(pair + letter)) {
            count++
            break
          }
        }
      }
    }
  }

  return count
}

/**
 * Find letters that would enable at least one word
 */
export function findHelpfulLetters(blocks: Block[]): string[] {
  const lockedBlocks = blocks.filter(b => b.locked)
  const helpful: Set<string> = new Set()

  // For each position adjacent to existing blocks, check what letters would form words
  for (const block of lockedBlocks) {
    const adjacentPositions = [
      { x: block.x - 1, y: block.y },
      { x: block.x + 1, y: block.y },
      { x: block.x, y: block.y - 1 },
      { x: block.x, y: block.y + 1 },
    ]

    for (const pos of adjacentPositions) {
      if (pos.x < 0 || pos.x >= GRID_WIDTH || pos.y < 0 || pos.y >= GRID_HEIGHT) continue
      if (lockedBlocks.some(b => b.x === pos.x && b.y === pos.y)) continue

      // Check what letters at this position would form words
      for (const letter of ALPHABET) {
        const testBlocks = [
          ...lockedBlocks,
          { x: pos.x, y: pos.y, letter, locked: true, color: '' },
        ]

        // Simple check: look for 3-letter sequences including this position
        const rowBlocks = testBlocks.filter(b => b.y === pos.y).sort((a, b) => a.x - b.x)
        const colBlocks = testBlocks.filter(b => b.x === pos.x).sort((a, b) => a.y - b.y)

        // Check horizontal sequences
        for (let start = 0; start <= rowBlocks.length - MIN_WORD_LENGTH; start++) {
          for (let end = start + MIN_WORD_LENGTH; end <= rowBlocks.length; end++) {
            const segment = rowBlocks.slice(start, end)
            // Only check if our new letter is in this segment
            if (segment.some(b => b.x === pos.x && b.y === pos.y)) {
              const word = segment.map(b => b.letter).join('')
              if (isValidWord(word)) {
                helpful.add(letter)
              }
            }
          }
        }

        // Check vertical sequences
        for (let start = 0; start <= colBlocks.length - MIN_WORD_LENGTH; start++) {
          for (let end = start + MIN_WORD_LENGTH; end <= colBlocks.length; end++) {
            const segment = colBlocks.slice(start, end)
            if (segment.some(b => b.x === pos.x && b.y === pos.y)) {
              const word = segment.map(b => b.letter).join('')
              if (isValidWord(word)) {
                helpful.add(letter)
              }
            }
          }
        }
      }
    }
  }

  return Array.from(helpful)
}

/**
 * Generate a letter for the game
 *
 * IMPORTANT: This is a SAFETY NET, not spoon-feeding!
 * - 90%+ of the time: Pure random with Scrabble weighting
 * - Only when grid is desperate (< 2 possible words): 30% chance to bias toward helpful letters
 * - Player still needs skill to position blocks and find words
 */
export function generateLetter(blocks: Block[]): string {
  const possibleWordCount = countPossibleWords(blocks)

  // NORMAL MODE (most of the time): Pure random, Scrabble-weighted
  // This maintains difficulty - you get what you get
  if (possibleWordCount >= 2) {
    return getRandomWeightedLetter()
  }

  // RESCUE MODE (only when grid is desperate):
  // 70% chance: Still random (maintain challenge)
  // 30% chance: Bias toward letters that enable words
  if (Math.random() > 0.3) {
    return getRandomWeightedLetter()
  }

  // Find letters that would enable at least one word
  const helpfulLetters = findHelpfulLetters(blocks)

  // If found helpful letters, pick randomly from them
  // Still random within the helpful set - not deterministic!
  if (helpfulLetters.length > 0) {
    return helpfulLetters[Math.floor(Math.random() * helpfulLetters.length)]
  }

  // Fallback: Random vowel (generally helpful)
  return VOWELS[Math.floor(Math.random() * VOWELS.length)]
}
