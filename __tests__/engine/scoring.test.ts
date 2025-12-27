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
  test('CAT scores as sum of letter values', () => {
    // C=3 + A=1 + T=1 = 5
    const score = calculateWordScore('CAT', 1)
    expect(score).toBe(5)
  })

  test('DOG scores as sum of letter values', () => {
    // D=2 + O=1 + G=2 = 5
    const score = calculateWordScore('DOG', 1)
    expect(score).toBe(5)
  })

  test('words with high-value letters score higher', () => {
    const catScore = calculateWordScore('CAT', 1) // C=3 + A=1 + T=1 = 5
    const jazScore = calculateWordScore('JAZ', 1) // J=8 + A=1 + Z=10 = 19

    expect(jazScore).toBeGreaterThan(catScore)
    expect(jazScore).toBe(19)
  })

  test('chain multiplier doubles score on 2nd chain', () => {
    const base = calculateWordScore('CAT', 1) // 5
    const chain2 = calculateWordScore('CAT', 2) // 10

    expect(base).toBe(5)
    expect(chain2).toBe(10)
  })

  test('chain multiplier triples score on 3rd chain', () => {
    const base = calculateWordScore('CAT', 1) // 5
    const chain3 = calculateWordScore('CAT', 3) // 15

    expect(base).toBe(5)
    expect(chain3).toBe(15)
  })

  test('chain multiplier applies correctly for any level', () => {
    const base = calculateWordScore('DOG', 1) // D=2 + O=1 + G=2 = 5
    const chain5 = calculateWordScore('DOG', 5) // 25

    expect(chain5).toBe(base * 5)
  })

  test('word length does not affect score (no length bonus)', () => {
    // All these words have similar letter values
    const cat = calculateWordScore('CAT', 1) // C=3 + A=1 + T=1 = 5
    const cats = calculateWordScore('CATS', 1) // C=3 + A=1 + T=1 + S=1 = 6

    // CATS only scores 1 more because of the extra S, not because it's longer
    expect(cats).toBe(cat + 1)
  })
})

describe('Total Score Calculation', () => {
  test('calculates total score for multiple words', () => {
    const words = ['CAT', 'DOG']
    const multipliers = [1, 1]

    const total = calculateTotalScore(words, multipliers)
    const expected =
      calculateWordScore('CAT', 1) + calculateWordScore('DOG', 1) // 5 + 5 = 10

    expect(total).toBe(expected)
    expect(total).toBe(10)
  })

  test('applies different multipliers per word', () => {
    const words = ['CAT', 'DOG']
    const multipliers = [1, 2]

    const total = calculateTotalScore(words, multipliers)
    // CAT at 1x = 5, DOG at 2x = 10
    expect(total).toBe(15)
  })

  test('handles empty word list', () => {
    expect(calculateTotalScore([], [])).toBe(0)
  })

  test('handles single word', () => {
    const total = calculateTotalScore(['CAT'], [1])
    expect(total).toBe(5)
  })

  test('chain bonus example: dog on 2nd chain worth 10', () => {
    // As per requirements: if "dog" comes in second, it's worth 10 instead of 5
    const dogChain2 = calculateWordScore('DOG', 2)
    expect(dogChain2).toBe(10)
  })

  test('chain bonus example: dog on 3rd chain worth 15', () => {
    // As per requirements: if it came in third, it'd be worth 15
    const dogChain3 = calculateWordScore('DOG', 3)
    expect(dogChain3).toBe(15)
  })

  test('words within words: POTS scores for all found words', () => {
    // When POTS (P-O-T-S) is on the board, we find: POTS, STOP, POT, TOP
    // Each scored separately at chain multiplier 1:
    // POTS = P(3) + O(1) + T(1) + S(1) = 6
    // STOP = S(1) + T(1) + O(1) + P(3) = 6 (reverse of POTS)
    // POT  = P(3) + O(1) + T(1) = 5
    // TOP  = T(1) + O(1) + P(3) = 5 (reverse of POT)
    // Total = 22 points

    const pots = calculateWordScore('POTS', 1)
    const stop = calculateWordScore('STOP', 1)
    const pot = calculateWordScore('POT', 1)
    const top = calculateWordScore('TOP', 1)

    expect(pots).toBe(6)
    expect(stop).toBe(6)
    expect(pot).toBe(5)
    expect(top).toBe(5)

    const total = pots + stop + pot + top
    expect(total).toBe(22)
  })
})
