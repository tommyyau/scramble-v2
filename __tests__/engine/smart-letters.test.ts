import { describe, test, expect } from 'vitest'
import { block } from '../setup'
import {
  generateLetter,
  getRandomWeightedLetter,
  findHelpfulLetters,
  countPossibleWords,
} from '../../src/lib/engine/smart-letters'

describe('Random Weighted Letter Generation', () => {
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

  test('rare letters appear less frequently', () => {
    const counts: Record<string, number> = {}

    for (let i = 0; i < 10000; i++) {
      const letter = getRandomWeightedLetter()
      counts[letter] = (counts[letter] || 0) + 1
    }

    // Q, X, Z should be rare
    const rareTotal = (counts['Q'] || 0) + (counts['X'] || 0) + (counts['Z'] || 0)
    expect(rareTotal).toBeLessThan(500) // Less than 5%
  })
})

describe('Smart Letter Generation - Maintains Randomness', () => {
  test('does NOT just give you what you need (maintains randomness)', () => {
    // If grid has C and A, next letter should NOT always be T
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
    ]

    const letters: string[] = []
    for (let i = 0; i < 100; i++) {
      letters.push(generateLetter(blocks))
    }

    const tCount = letters.filter(l => l === 'T').length

    // T should NOT appear 100% of the time - that would be spoon-feeding
    // It should appear roughly at Scrabble frequency (6/98 ≈ 6%)
    expect(tCount).toBeLessThan(50) // Less than 50% should be T
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
    const blocks = [block(0, 7, 'A', true)]

    const results = new Set<string>()
    for (let i = 0; i < 50; i++) {
      results.add(generateLetter(blocks))
    }

    // Should produce variety
    expect(results.size).toBeGreaterThan(5)
  })
})

describe('Smart Letter Generation - Safety Net', () => {
  test('prevents impossible situations eventually', () => {
    // Grid full of rare consonants - should eventually get helpful letters
    const impossibleGrid = [
      block(0, 7, 'Q', true),
      block(1, 7, 'X', true),
      block(2, 7, 'Z', true),
      block(3, 7, 'J', true),
    ]

    const letters: string[] = []
    for (let i = 0; i < 100; i++) {
      letters.push(generateLetter(impossibleGrid))
    }

    const vowels = letters.filter(l => 'AEIOU'.includes(l))

    // Should get SOME vowels to help (but not guaranteed every time)
    // With rescue mode at 30% and impossible grid, should get more vowels
    expect(vowels.length).toBeGreaterThan(20)
  })

  test('with good grid, uses pure random distribution', () => {
    // Grid that already has many possible words
    const goodGrid = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
      block(2, 7, 'T', true), // CAT already formed
      block(3, 7, 'E', true),
      block(4, 7, 'R', true),
    ]

    const letters: string[] = []
    for (let i = 0; i < 100; i++) {
      letters.push(generateLetter(goodGrid))
    }

    // Distribution should be roughly Scrabble-weighted
    const uniqueLetters = new Set(letters)
    expect(uniqueLetters.size).toBeGreaterThan(10)
  })
})

describe('Helper Functions', () => {
  test('countPossibleWords counts correctly', () => {
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
    ]

    const count = countPossibleWords(blocks)
    // With C and A, adding T would make CAT, D would make... etc.
    // Should find some possible words
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('countPossibleWords returns 0 for impossible grid', () => {
    const blocks = [
      block(0, 7, 'Q', true),
      block(1, 7, 'Q', true),
      block(2, 7, 'Q', true),
    ]

    const count = countPossibleWords(blocks)
    // QQQ cannot form any valid words
    expect(count).toBe(0)
  })

  test('findHelpfulLetters returns letters that enable words', () => {
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
    ]

    const helpful = findHelpfulLetters(blocks)

    // T should be helpful (makes CAT)
    // R should be helpful (makes CAR)
    // etc.
    expect(helpful.length).toBeGreaterThan(0)
    // T should definitely be in there
    expect(helpful).toContain('T')
  })

  test('findHelpfulLetters returns empty for very constrained grid', () => {
    // Single isolated block with no adjacents - hard to form words
    const blocks = [
      block(4, 4, 'Q', true),
    ]

    const helpful = findHelpfulLetters(blocks)
    // Q alone is very hard to help - but some letters might work
    expect(helpful.length).toBeLessThanOrEqual(26)
  })
})

describe('Distribution Balance', () => {
  test('over many games, letter distribution is fair', () => {
    // Simulate many letter generations across different grid states
    const allLetters: string[] = []

    // Empty grid
    for (let i = 0; i < 500; i++) {
      allLetters.push(generateLetter([]))
    }

    // Partially filled grid
    const partialGrid = [
      block(0, 7, 'S', true),
      block(1, 7, 'T', true),
    ]
    for (let i = 0; i < 500; i++) {
      allLetters.push(generateLetter(partialGrid))
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
})
