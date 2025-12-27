import { Block, GameMode } from '../types'
import { SCRABBLE_WEIGHTS } from '../constants'

// ============ LETTER BUFFER STATE ============

let letterBuffer: string[] = []

/**
 * Reset letter buffer - call when starting a new game
 */
export function resetLetterBuffer(): void {
  letterBuffer = []
}

// ============ SEEDED RANDOM FOR DAILY MODE ============

/**
 * Mulberry32 - a fast, high-quality 32-bit seeded PRNG
 * Returns a function that generates numbers between 0 and 1
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

/**
 * Get today's date as a numeric seed (YYYYMMDD format)
 * Uses UTC to ensure same seed worldwide
 */
export function getDailySeed(): number {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const day = now.getUTCDate()
  return year * 10000 + month * 100 + day
}

// Track letter index for daily mode (reset each game)
let dailyLetterIndex = 0

/**
 * Reset daily letter index - call when starting a new daily game
 */
export function resetDailyLetterIndex(): void {
  dailyLetterIndex = 0
}

/**
 * Create a seeded RNG for daily mode
 * Each call advances the index to ensure unique values
 */
function createDailyRng(): () => number {
  const seed = getDailySeed() * 1000 + dailyLetterIndex++
  return mulberry32(seed)
}

// ============ BATCH LETTER GENERATION ============

const VOWELS = ['A', 'E', 'I', 'O', 'U'] as const
const CONSONANTS = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Y', 'Z'] as const

/**
 * Build a pile of letters based on Scrabble counts
 * Each letter appears as many times as its Scrabble tile count
 */
function buildPile(letters: readonly string[]): string[] {
  const pile: string[] = []
  for (const letter of letters) {
    const count = SCRABBLE_WEIGHTS[letter] || 1
    for (let i = 0; i < count; i++) {
      pile.push(letter)
    }
  }
  return pile
}

/**
 * Draw N random letters from a pile without replacement
 */
function drawFromPile(pile: string[], count: number, rng: () => number): string[] {
  const drawn: string[] = []
  for (let i = 0; i < count && pile.length > 0; i++) {
    const index = Math.floor(rng() * pile.length)
    drawn.push(pile[index])
    pile.splice(index, 1) // Remove from pile (no replacement within batch)
  }
  return drawn
}

/**
 * Fisher-Yates shuffle
 */
function shuffle(array: string[], rng: () => number): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

/**
 * Refill the letter buffer with a new batch of 2-5 letters
 * Always includes at least 1 vowel and 1 consonant
 */
function refillBuffer(rng: () => number): void {
  // Build fresh piles for this batch
  const vowelPile = buildPile(VOWELS)
  const consonantPile = buildPile(CONSONANTS)

  // Draw 1-2 vowels: max(1, floor(rng * 3)) yields 1 or 2
  const vowelCount = Math.max(1, Math.floor(rng() * 3))
  const drawnVowels = drawFromPile(vowelPile, vowelCount, rng)

  // Draw 1-3 consonants: max(1, floor(rng * 4)) yields 1, 2, or 3
  const consonantCount = Math.max(1, Math.floor(rng() * 4))
  const drawnConsonants = drawFromPile(consonantPile, consonantCount, rng)

  // Combine and shuffle
  const batch = [...drawnVowels, ...drawnConsonants]
  shuffle(batch, rng)

  letterBuffer = batch
}

/**
 * Generate a letter for the game using batch-based approach
 *
 * Maintains a buffer of 2-5 letters (1-2 vowels + 1-3 consonants)
 * When buffer empties, refill from Scrabble-weighted piles
 *
 * For DAILY MODE: Uses seeded random so everyone gets the same letters
 * For OTHER MODES: Uses Math.random
 */
export function generateLetter(_blocks: Block[], mode?: GameMode): string {
  // Create appropriate RNG based on mode
  // Note: For daily mode, we create a new RNG per call to maintain determinism
  // since the seed incorporates dailyLetterIndex which increments
  const rng = mode === 'daily' ? createDailyRng() : () => Math.random()

  if (letterBuffer.length === 0) {
    refillBuffer(rng)
  }

  return letterBuffer.shift()!
}

// Legacy export for compatibility (no longer used but kept for any external refs)
export function getRandomWeightedLetter(): string {
  const totalWeight = Object.values(SCRABBLE_WEIGHTS).reduce((a, b) => a + b, 0)
  let random = Math.random() * totalWeight

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  for (const letter of ALPHABET) {
    random -= SCRABBLE_WEIGHTS[letter]
    if (random <= 0) {
      return letter
    }
  }

  return 'E'
}
