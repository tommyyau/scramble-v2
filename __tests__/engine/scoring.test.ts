import { describe, test, expect } from 'vitest'
import {
  calculateWordScore,
  calculateLetterScore,
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

describe('Word Scoring', () => {
  test('CAT scores correctly (sum of Scrabble letter values)', () => {
    // C=3 + A=1 + T=1 = 5 base
    const score = calculateWordScore('CAT', { chainMultiplier: 1 })
    expect(score).toBe(5)
  })

  test('chain multiplier applies correctly', () => {
    const base = calculateWordScore('CAT', { chainMultiplier: 1 })
    const chain2 = calculateWordScore('CAT', { chainMultiplier: 2 })
    const chain3 = calculateWordScore('CAT', { chainMultiplier: 3 })

    expect(chain2).toBe(base * 2)
    expect(chain3).toBe(base * 3)
  })

  test('streak multiplier applies to base Scrabble score', () => {
    const base = calculateWordScore('CAT', { chainMultiplier: 1 })
    const streak2 = calculateWordScore('CAT', { chainMultiplier: 1, streakMultiplier: 2 })
    const streak3 = calculateWordScore('CAT', { chainMultiplier: 1, streakMultiplier: 3 })

    expect(streak2).toBe(base * 2)
    expect(streak3).toBe(base * 3)
  })

  test('streak of 1 is equivalent to no streak bonus', () => {
    const noStreak = calculateWordScore('CAT', { chainMultiplier: 1 })
    const streak1 = calculateWordScore('CAT', { chainMultiplier: 1, streakMultiplier: 1 })

    expect(streak1).toBe(noStreak)
  })

  test('streak and chain bonuses stack', () => {
    // CAT: C=3 + A=1 + T=1 = 5 base
    // With streak 2: 5 * 2 = 10
    // With chain 2: 10 * 2 = 20
    const stacked = calculateWordScore('CAT', { chainMultiplier: 2, streakMultiplier: 2 })

    expect(stacked).toBe(20)
  })

  test('words with high-value letters score higher', () => {
    const catScore = calculateWordScore('CAT', { chainMultiplier: 1 })
    const jazScore = calculateWordScore('JAZ', { chainMultiplier: 1 }) // Hypothetical

    // JAZ has J=8 + A=1 + Z=10 = 19 vs CAT's C=3 + A=1 + T=1 = 5
    expect(jazScore).toBeGreaterThan(catScore)
  })
})

describe('Total Score Calculation', () => {
  test('calculates total score for multiple words', () => {
    const words = ['CAT', 'DOG']
    const multipliers = [1, 1]

    const total = calculateTotalScore(words, multipliers)
    const expected =
      calculateWordScore('CAT', { chainMultiplier: 1 }) +
      calculateWordScore('DOG', { chainMultiplier: 1 })

    expect(total).toBe(expected)
  })

  test('applies different multipliers per word', () => {
    const words = ['CAT', 'DOG']
    const multipliers = [1, 2]

    const total = calculateTotalScore(words, multipliers)
    const expected =
      calculateWordScore('CAT', { chainMultiplier: 1 }) +
      calculateWordScore('DOG', { chainMultiplier: 2 })

    expect(total).toBe(expected)
  })

  test('handles empty word list', () => {
    expect(calculateTotalScore([], [])).toBe(0)
  })

  test('handles single word', () => {
    const total = calculateTotalScore(['CAT'], [1])
    expect(total).toBe(calculateWordScore('CAT', { chainMultiplier: 1 }))
  })
})
