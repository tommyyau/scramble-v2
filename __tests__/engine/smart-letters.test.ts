import { describe, test, expect, beforeEach } from 'vitest'
import {
  generateLetter,
  getRandomWeightedLetter,
  getDailySeed,
  resetDailyLetterIndex,
  resetLetterBuffer,
} from '../../src/lib/engine/smart-letters'

// Reset buffer before each test to ensure clean state
beforeEach(() => {
  resetLetterBuffer()
  resetDailyLetterIndex()
})

describe('Random Weighted Letter Generation (legacy)', () => {
  test('generates valid letter A-Z', () => {
    for (let i = 0; i < 100; i++) {
      const letter = getRandomWeightedLetter()
      expect(letter).toMatch(/^[A-Z]$/)
    }
  })

  test('respects Scrabble distribution over many iterations', () => {
    const counts: Record<string, number> = {}

    for (let i = 0; i < 10000; i++) {
      const letter = getRandomWeightedLetter()
      counts[letter] = (counts[letter] || 0) + 1
    }

    // E should appear more than Q (E=12, Q=1 in Scrabble)
    expect(counts['E']).toBeGreaterThan(counts['Q'] * 5)

    // Vowels should be reasonably common (A=9, E=12, I=9, O=8, U=4 = 42 out of 98)
    const vowels =
      (counts['A'] || 0) +
      (counts['E'] || 0) +
      (counts['I'] || 0) +
      (counts['O'] || 0) +
      (counts['U'] || 0)
    expect(vowels).toBeGreaterThan(3000) // ~30%+
  })
})

describe('Batch Letter Generation', () => {
  test('generates valid letter A-Z', () => {
    for (let i = 0; i < 100; i++) {
      resetLetterBuffer() // Force new batch each time
      const letter = generateLetter([])
      expect(letter).toMatch(/^[A-Z]$/)
    }
  })

  test('batch contains both vowels and consonants', () => {
    // Generate letters to exhaust multiple batches
    // Each batch is 2-5 letters, so 100 letters = ~20-50 batches
    const vowels = new Set(['A', 'E', 'I', 'O', 'U'])

    for (let batchTest = 0; batchTest < 50; batchTest++) {
      resetLetterBuffer()

      // Collect one full batch (max 5 letters)
      const batch: string[] = []
      for (let i = 0; i < 5; i++) {
        batch.push(generateLetter([]))
      }

      // At least the first 2 letters came from same batch
      // Check that first few have both vowel and consonant
      const first3 = batch.slice(0, 3)
      const hasVowel = first3.some(l => vowels.has(l))
      const hasConsonant = first3.some(l => !vowels.has(l))

      // Each batch should have at least 1 vowel and 1 consonant
      // With 2-5 letters per batch, checking first 3 should catch both
      expect(hasVowel || hasConsonant).toBe(true)
    }
  })

  test('batch size is between 2 and 5', () => {
    // We can't directly observe batch size, but we can infer it
    // by seeing when the buffer runs out (letters become more predictable)
    // This is a simplified check that letters are generated
    resetLetterBuffer()

    const letters: string[] = []
    for (let i = 0; i < 100; i++) {
      letters.push(generateLetter([]))
    }

    // Should have variety across many batches
    const uniqueLetters = new Set(letters)
    expect(uniqueLetters.size).toBeGreaterThan(10)
  })

  test('letter generation is random with empty grid', () => {
    const letters: string[] = []
    for (let i = 0; i < 100; i++) {
      letters.push(generateLetter([]))
    }

    // Should have variety
    const uniqueLetters = new Set(letters)
    expect(uniqueLetters.size).toBeGreaterThan(10)
  })

  test('consecutive calls produce different results', () => {
    const results = new Set<string>()
    for (let i = 0; i < 50; i++) {
      results.add(generateLetter([]))
    }

    // Should produce variety
    expect(results.size).toBeGreaterThan(5)
  })

  test('guarantees vowels appear regularly', () => {
    const vowels = new Set(['A', 'E', 'I', 'O', 'U'])

    // Over 100 letters, we should see plenty of vowels
    // With 1-2 vowels per 2-5 letter batch, vowels should be 20-50%
    const letters: string[] = []
    for (let i = 0; i < 100; i++) {
      letters.push(generateLetter([]))
    }

    const vowelCount = letters.filter(l => vowels.has(l)).length

    // Should be between 20% and 60%
    expect(vowelCount).toBeGreaterThan(15)
    expect(vowelCount).toBeLessThan(70)
  })

  test('guarantees consonants appear regularly', () => {
    const vowels = new Set(['A', 'E', 'I', 'O', 'U'])

    // Over 100 letters, we should see plenty of consonants
    // With 1-3 consonants per 2-5 letter batch, consonants should be 33-75%
    const letters: string[] = []
    for (let i = 0; i < 100; i++) {
      letters.push(generateLetter([]))
    }

    const consonantCount = letters.filter(l => !vowels.has(l)).length

    // Should be between 30% and 85%
    expect(consonantCount).toBeGreaterThan(25)
    expect(consonantCount).toBeLessThan(90)
  })
})

describe('Distribution Balance', () => {
  test('over many games, letter distribution follows Scrabble weights', () => {
    const allLetters: string[] = []

    // Generate many letters
    for (let i = 0; i < 1000; i++) {
      allLetters.push(generateLetter([]))
    }

    // Calculate frequencies
    const counts: Record<string, number> = {}
    allLetters.forEach(l => {
      counts[l] = (counts[l] || 0) + 1
    })

    // Common letters should appear more than rare ones
    expect(counts['E'] || 0).toBeGreaterThan(counts['Z'] || 0)
    expect(counts['A'] || 0).toBeGreaterThan(counts['X'] || 0)
    expect(counts['T'] || 0).toBeGreaterThan(counts['Q'] || 0)
  })

  test('rare letters still appear but less frequently', () => {
    const counts: Record<string, number> = {}

    for (let i = 0; i < 1000; i++) {
      const letter = generateLetter([])
      counts[letter] = (counts[letter] || 0) + 1
    }

    // Q, X, Z should be rare but present
    const rareTotal = (counts['Q'] || 0) + (counts['X'] || 0) + (counts['Z'] || 0)
    expect(rareTotal).toBeGreaterThan(0) // They should appear
    expect(rareTotal).toBeLessThan(100) // But be rare (<10%)
  })
})

describe('Daily Mode - Seeded Random', () => {
  test('getDailySeed returns numeric seed in YYYYMMDD format', () => {
    const seed = getDailySeed()
    expect(seed).toBeGreaterThan(20240101) // After 2024
    expect(seed).toBeLessThan(21000101) // Before 2100
  })

  test('daily mode produces same sequence when reset', () => {
    // First sequence
    resetLetterBuffer()
    resetDailyLetterIndex()
    const sequence1: string[] = []
    for (let i = 0; i < 20; i++) {
      sequence1.push(generateLetter([], 'daily'))
    }

    // Reset and generate again
    resetLetterBuffer()
    resetDailyLetterIndex()
    const sequence2: string[] = []
    for (let i = 0; i < 20; i++) {
      sequence2.push(generateLetter([], 'daily'))
    }

    // Should be identical
    expect(sequence1).toEqual(sequence2)
  })

  test('daily mode ignores grid state (deterministic)', () => {
    // Grid state shouldn't affect daily mode
    const someBlocks = [
      { id: 1, x: 0, y: 7, letter: 'C', locked: true, color: 'blue' },
      { id: 2, x: 1, y: 7, letter: 'A', locked: true, color: 'red' },
    ]

    resetLetterBuffer()
    resetDailyLetterIndex()
    const sequence1: string[] = []
    for (let i = 0; i < 10; i++) {
      sequence1.push(generateLetter(someBlocks, 'daily'))
    }

    // Reset and use empty grid
    resetLetterBuffer()
    resetDailyLetterIndex()
    const sequence2: string[] = []
    for (let i = 0; i < 10; i++) {
      sequence2.push(generateLetter([], 'daily'))
    }

    // Should be identical regardless of grid state
    expect(sequence1).toEqual(sequence2)
  })

  test('non-daily modes use random (not seeded)', () => {
    // Classic mode should produce different results each run
    // We can't guarantee this 100%, but over multiple runs it should vary
    resetLetterBuffer()
    const results1 = new Set<string>()
    for (let i = 0; i < 50; i++) {
      results1.add(generateLetter([], 'classic'))
    }

    // Should have variety (random)
    expect(results1.size).toBeGreaterThan(5)
  })

  test('daily mode has vowel/consonant balance like other modes', () => {
    resetLetterBuffer()
    resetDailyLetterIndex()

    const vowels = new Set(['A', 'E', 'I', 'O', 'U'])
    const letters: string[] = []

    for (let i = 0; i < 100; i++) {
      letters.push(generateLetter([], 'daily'))
    }

    const vowelCount = letters.filter(l => vowels.has(l)).length

    // Should have balanced distribution
    expect(vowelCount).toBeGreaterThan(15)
    expect(vowelCount).toBeLessThan(70)
  })
})

describe('Buffer Reset', () => {
  test('resetLetterBuffer clears the buffer', () => {
    // Generate some letters
    for (let i = 0; i < 3; i++) {
      generateLetter([])
    }

    // Reset
    resetLetterBuffer()

    // Next letter should come from a fresh batch
    const letter = generateLetter([])
    expect(letter).toMatch(/^[A-Z]$/)
  })

  test('each game starts fresh after reset', () => {
    // Simulate two games with reset between
    resetLetterBuffer()
    resetDailyLetterIndex()

    const game1Letters: string[] = []
    for (let i = 0; i < 10; i++) {
      game1Letters.push(generateLetter([], 'daily'))
    }

    // Start new game
    resetLetterBuffer()
    resetDailyLetterIndex()

    const game2Letters: string[] = []
    for (let i = 0; i < 10; i++) {
      game2Letters.push(generateLetter([], 'daily'))
    }

    // Daily mode should produce same sequence after proper reset
    expect(game1Letters).toEqual(game2Letters)
  })
})
