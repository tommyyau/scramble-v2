import { describe, test, expect } from 'vitest'
import {
  calculateWordScore,
  calculateLetterScore,
  getLengthMultiplier,
  isRareWord,
  calculateTotalScore,
} from '../../src/lib/engine/scoring'

describe('Letter Scoring', () => {
  test('common letters score 1 point', () => {
    expect(calculateLetterScore('A')).toBe(1)
    expect(calculateLetterScore('E')).toBe(1)
    expect(calculateLetterScore('I')).toBe(1)
    expect(calculateLetterScore('O')).toBe(1)
    expect(calculateLetterScore('N')).toBe(1)
    expect(calculateLetterScore('R')).toBe(1)
    expect(calculateLetterScore('T')).toBe(1)
    expect(calculateLetterScore('L')).toBe(1)
    expect(calculateLetterScore('S')).toBe(1)
    expect(calculateLetterScore('U')).toBe(1)
  })

  test('medium letters score 2-4 points', () => {
    expect(calculateLetterScore('D')).toBe(2)
    expect(calculateLetterScore('G')).toBe(2)
    expect(calculateLetterScore('B')).toBe(3)
    expect(calculateLetterScore('C')).toBe(3)
    expect(calculateLetterScore('M')).toBe(3)
    expect(calculateLetterScore('P')).toBe(3)
    expect(calculateLetterScore('F')).toBe(4)
    expect(calculateLetterScore('H')).toBe(4)
    expect(calculateLetterScore('V')).toBe(4)
    expect(calculateLetterScore('W')).toBe(4)
    expect(calculateLetterScore('Y')).toBe(4)
  })

  test('rare letters score 5-10 points', () => {
    expect(calculateLetterScore('K')).toBe(5)
    expect(calculateLetterScore('J')).toBe(8)
    expect(calculateLetterScore('X')).toBe(8)
    expect(calculateLetterScore('Q')).toBe(10)
    expect(calculateLetterScore('Z')).toBe(10)
  })

  test('lowercase letters converted to uppercase', () => {
    expect(calculateLetterScore('a')).toBe(calculateLetterScore('A'))
    expect(calculateLetterScore('z')).toBe(calculateLetterScore('Z'))
  })
})

describe('Length Multiplier', () => {
  test('3-letter words get 1x multiplier', () => {
    expect(getLengthMultiplier(3)).toBe(1)
  })

  test('4-letter words get 1.5x multiplier', () => {
    expect(getLengthMultiplier(4)).toBe(1.5)
  })

  test('5-letter words get 2x multiplier', () => {
    expect(getLengthMultiplier(5)).toBe(2)
  })

  test('6-letter words get 3x multiplier', () => {
    expect(getLengthMultiplier(6)).toBe(3)
  })

  test('7-letter words get 4x multiplier', () => {
    expect(getLengthMultiplier(7)).toBe(4)
  })

  test('8-letter words get 5x multiplier', () => {
    expect(getLengthMultiplier(8)).toBe(5)
  })
})

describe('Word Scoring', () => {
  test('CAT scores correctly (3 letters, common)', () => {
    // C=3 + A=1 + T=1 = 5 base
    // 3-letter multiplier = 1x
    const score = calculateWordScore('CAT', { chainMultiplier: 1, isRare: false })
    expect(score).toBe(5)
  })

  test('CATS scores more than CAT (length bonus)', () => {
    const catScore = calculateWordScore('CAT', { chainMultiplier: 1, isRare: false })
    const catsScore = calculateWordScore('CATS', { chainMultiplier: 1, isRare: false })
    expect(catsScore).toBeGreaterThan(catScore)
  })

  test('longer words get higher scores', () => {
    const scores = [
      calculateWordScore('CAT', { chainMultiplier: 1, isRare: false }),
      calculateWordScore('CATS', { chainMultiplier: 1, isRare: false }),
      calculateWordScore('HOUSE', { chainMultiplier: 1, isRare: false }),
      calculateWordScore('BRIDGE', { chainMultiplier: 1, isRare: false }),
    ]

    // Each should be larger than the previous
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1])
    }
  })

  test('chain multiplier applies correctly', () => {
    const base = calculateWordScore('CAT', { chainMultiplier: 1, isRare: false })
    const chain2 = calculateWordScore('CAT', { chainMultiplier: 2, isRare: false })
    const chain3 = calculateWordScore('CAT', { chainMultiplier: 3, isRare: false })

    expect(chain2).toBe(base * 2)
    expect(chain3).toBe(base * 3)
  })

  test('rare words get 1.5x bonus', () => {
    const common = calculateWordScore('CAT', { chainMultiplier: 1, isRare: false })
    const rare = calculateWordScore('CAT', { chainMultiplier: 1, isRare: true })

    expect(rare).toBe(Math.round(common * 1.5))
  })

  test('chain and rare bonuses stack', () => {
    const base = calculateWordScore('CAT', { chainMultiplier: 1, isRare: false })
    const stacked = calculateWordScore('CAT', { chainMultiplier: 2, isRare: true })

    // Should be base * 2 (chain) * 1.5 (rare)
    expect(stacked).toBe(Math.round(base * 2 * 1.5))
  })

  test('streak multiplier applies to base Scrabble score', () => {
    const base = calculateWordScore('CAT', { chainMultiplier: 1, isRare: false })
    const streak2 = calculateWordScore('CAT', { chainMultiplier: 1, isRare: false, streakMultiplier: 2 })
    const streak3 = calculateWordScore('CAT', { chainMultiplier: 1, isRare: false, streakMultiplier: 3 })

    expect(streak2).toBe(base * 2)
    expect(streak3).toBe(base * 3)
  })

  test('streak of 1 is equivalent to no streak bonus', () => {
    const noStreak = calculateWordScore('CAT', { chainMultiplier: 1, isRare: false })
    const streak1 = calculateWordScore('CAT', { chainMultiplier: 1, isRare: false, streakMultiplier: 1 })

    expect(streak1).toBe(noStreak)
  })

  test('streak, chain, and rare bonuses all stack', () => {
    // CAT: C=3 + A=1 + T=1 = 5 base
    // With streak 2: 5 * 2 = 10
    // With length multiplier (3 letters = 1x): 10 * 1 = 10
    // With chain 2: 10 * 2 = 20
    // With rare 1.5x: 20 * 1.5 = 30
    const stacked = calculateWordScore('CAT', { chainMultiplier: 2, isRare: true, streakMultiplier: 2 })

    expect(stacked).toBe(30)
  })

  test('words with rare letters score higher', () => {
    const catScore = calculateWordScore('CAT', { chainMultiplier: 1, isRare: false })
    const jazScore = calculateWordScore('JAZ', { chainMultiplier: 1, isRare: false }) // Hypothetical

    // JAZ has J=8 + A=1 + Z=10 = 19 vs CAT's C=3 + A=1 + T=1 = 5
    expect(jazScore).toBeGreaterThan(catScore)
  })
})

describe('Rare Word Detection', () => {
  test('common words are not rare', () => {
    expect(isRareWord('CAT')).toBe(false)
    expect(isRareWord('DOG')).toBe(false)
    expect(isRareWord('THE')).toBe(false)
    expect(isRareWord('AND')).toBe(false)
    expect(isRareWord('RUN')).toBe(false)
  })

  test('uncommon words are rare', () => {
    // Words with Q, X, Z, or unusual combinations
    expect(isRareWord('QUIZ')).toBe(true)
    expect(isRareWord('JAZZ')).toBe(true)
    expect(isRareWord('JINX')).toBe(true)
  })

  test('words with rare letters tend to be rare', () => {
    // Any word containing Q, X, Z, J is considered rare
    expect(isRareWord('QUILT')).toBe(true)
    expect(isRareWord('MIXER')).toBe(true)
    expect(isRareWord('WALTZ')).toBe(true)
  })
})

describe('Total Score Calculation', () => {
  test('calculates total score for multiple words', () => {
    const words = ['CAT', 'DOG']
    const multipliers = [1, 1]

    const total = calculateTotalScore(words, multipliers)
    const expected =
      calculateWordScore('CAT', { chainMultiplier: 1, isRare: false }) +
      calculateWordScore('DOG', { chainMultiplier: 1, isRare: false })

    expect(total).toBe(expected)
  })

  test('applies different multipliers per word', () => {
    const words = ['CAT', 'DOG']
    const multipliers = [1, 2]

    const total = calculateTotalScore(words, multipliers)
    const expected =
      calculateWordScore('CAT', { chainMultiplier: 1, isRare: false }) +
      calculateWordScore('DOG', { chainMultiplier: 2, isRare: false })

    expect(total).toBe(expected)
  })

  test('handles empty word list', () => {
    expect(calculateTotalScore([], [])).toBe(0)
  })

  test('handles single word', () => {
    const total = calculateTotalScore(['CAT'], [1])
    expect(total).toBe(calculateWordScore('CAT', { chainMultiplier: 1, isRare: false }))
  })
})
