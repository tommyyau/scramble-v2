import { describe, test, expect } from 'vitest'
import { block, createTestState } from '../setup'
import { processChainReaction } from '../../src/lib/engine/chains'
import { calculateWordScore } from '../../src/lib/engine/scoring'

describe('Streak Multiplier Scoring', () => {
  describe('Basic streak multiplier', () => {
    test('streak of 1 gives 1x multiplier (base score)', () => {
      const state = createTestState({
        blocks: [
          // CAT = C(3) + A(1) + T(1) = 5 base
          block(0, 7, 'C', true),
          block(1, 7, 'A', true),
          block(2, 7, 'T', true),
        ],
      })

      const result = processChainReaction(state, 1) // streak = 1

      // CAT with streak 1, chain 1 = 5 * 1 * 1 = 5
      expect(result.score).toBe(5)
    })

    test('streak of 2 doubles the score', () => {
      const state = createTestState({
        blocks: [
          block(0, 7, 'C', true),
          block(1, 7, 'A', true),
          block(2, 7, 'T', true),
        ],
      })

      const result = processChainReaction(state, 2) // streak = 2

      // CAT with streak 2, chain 1 = 5 * 2 * 1 = 10
      expect(result.score).toBe(10)
    })

    test('streak of 3 triples the score', () => {
      const state = createTestState({
        blocks: [
          block(0, 7, 'C', true),
          block(1, 7, 'A', true),
          block(2, 7, 'T', true),
        ],
      })

      const result = processChainReaction(state, 3) // streak = 3

      // CAT with streak 3, chain 1 = 5 * 3 * 1 = 15
      expect(result.score).toBe(15)
    })

    test('streak of 5 gives 5x multiplier', () => {
      const state = createTestState({
        blocks: [
          block(0, 7, 'C', true),
          block(1, 7, 'A', true),
          block(2, 7, 'T', true),
        ],
      })

      const result = processChainReaction(state, 5) // streak = 5

      // CAT with streak 5, chain 1 = 5 * 5 * 1 = 25
      expect(result.score).toBe(25)
    })

    test('streak of 10 gives 10x multiplier', () => {
      const state = createTestState({
        blocks: [
          block(0, 7, 'C', true),
          block(1, 7, 'A', true),
          block(2, 7, 'T', true),
        ],
      })

      const result = processChainReaction(state, 10) // streak = 10

      // CAT with streak 10, chain 1 = 5 * 10 * 1 = 50
      expect(result.score).toBe(50)
    })
  })

  describe('Streak with different words', () => {
    test('higher value letters get streak bonus too', () => {
      const state = createTestState({
        blocks: [
          // JAB = J(8) + A(1) + B(3) = 12 base
          block(0, 7, 'J', true),
          block(1, 7, 'A', true),
          block(2, 7, 'B', true),
        ],
      })

      const streak1 = processChainReaction(state, 1)

      // Reset state for streak 2 test
      const state2 = createTestState({
        blocks: [
          block(0, 7, 'J', true),
          block(1, 7, 'A', true),
          block(2, 7, 'B', true),
        ],
      })
      const streak2 = processChainReaction(state2, 2)

      // Streak 2 should be exactly double streak 1
      expect(streak2.score).toBe(streak1.score * 2)
    })

    test('DOG scores correctly with streak (includes reverse GOD)', () => {
      const state = createTestState({
        blocks: [
          // DOG = D(2) + O(1) + G(2) = 5 base
          // GOD = G(2) + O(1) + D(2) = 5 base (reverse is also valid!)
          // Total base = 10
          block(0, 7, 'D', true),
          block(1, 7, 'O', true),
          block(2, 7, 'G', true),
        ],
      })

      const result = processChainReaction(state, 3) // streak = 3

      // DOG + GOD with streak 3 = 10 * 3 = 30
      expect(result.score).toBe(30)
      expect(result.wordsFound).toContain('DOG')
      expect(result.wordsFound).toContain('GOD')
    })
  })

  describe('Streak and chain multipliers stacking', () => {
    test('streak 2 with chain 1 = 2x total', () => {
      const state = createTestState({
        blocks: [
          block(0, 7, 'C', true),
          block(1, 7, 'A', true),
          block(2, 7, 'T', true),
        ],
      })

      const result = processChainReaction(state, 2)

      // CAT = 5 base, streak 2, chain 1 = 5 * 2 * 1 = 10
      expect(result.score).toBe(10)
      expect(result.chainCount).toBe(1)
    })

    test('multiple words at same chain level share streak multiplier', () => {
      const state = createTestState({
        blocks: [
          // CAT on left (TAC is not a word) = 5 base
          block(0, 7, 'C', true),
          block(1, 7, 'A', true),
          block(2, 7, 'T', true),
          // DOG on right = 5 base, plus GOD reverse = 5 base
          block(5, 7, 'D', true),
          block(6, 7, 'O', true),
          block(7, 7, 'G', true),
        ],
      })

      const result = processChainReaction(state, 2)

      // CAT = 5, DOG = 5, GOD = 5, all at chain 1 with streak 2
      // Total = (5 + 5 + 5) * 2 = 30
      expect(result.score).toBe(30)
      expect(result.chainCount).toBe(1)
    })
  })

  describe('Default streak behavior', () => {
    test('no streak parameter defaults to 1x', () => {
      const state = createTestState({
        blocks: [
          block(0, 7, 'C', true),
          block(1, 7, 'A', true),
          block(2, 7, 'T', true),
        ],
      })

      // Call without streak parameter
      const result = processChainReaction(state)

      // Should use default of 1
      expect(result.score).toBe(5)
    })
  })
})

describe('Chain Multiplier Scoring', () => {
  test('chain of 1 gives 1x multiplier', () => {
    // Single word, no cascade
    const state = createTestState({
      blocks: [
        block(0, 7, 'C', true),
        block(1, 7, 'A', true),
        block(2, 7, 'T', true),
      ],
    })

    const result = processChainReaction(state, 1)

    expect(result.chainCount).toBe(1)
    expect(result.score).toBe(5) // 5 * 1 (streak) * 1 (chain)
  })
})

describe('Reversible Word Bonus', () => {
  test('words valid in both directions score twice', () => {
    const state = createTestState({
      blocks: [
        // DOG forwards, GOD backwards - both valid words
        block(0, 7, 'D', true),
        block(1, 7, 'O', true),
        block(2, 7, 'G', true),
      ],
    })

    const result = processChainReaction(state, 1)

    // DOG = 5, GOD = 5, total = 10
    expect(result.score).toBe(10)
    expect(result.wordsFound).toContain('DOG')
    expect(result.wordsFound).toContain('GOD')
  })

  test('reversible words get streak bonus on both words', () => {
    const state = createTestState({
      blocks: [
        block(0, 7, 'D', true),
        block(1, 7, 'O', true),
        block(2, 7, 'G', true),
      ],
    })

    const result = processChainReaction(state, 4) // streak = 4

    // DOG + GOD base = 10, with streak 4 = 40
    expect(result.score).toBe(40)
  })

  test('non-reversible words only score once', () => {
    const state = createTestState({
      blocks: [
        // CAT is valid, TAC is not
        block(0, 7, 'C', true),
        block(1, 7, 'A', true),
        block(2, 7, 'T', true),
      ],
    })

    const result = processChainReaction(state, 1)

    // Only CAT = 5
    expect(result.score).toBe(5)
    expect(result.wordsFound).toContain('CAT')
    expect(result.wordsFound).not.toContain('TAC')
  })
})

describe('Overlapping Words Bonus', () => {
  test('S-P-O-T finds overlapping words and reversals', () => {
    const state = createTestState({
      blocks: [
        // S-P-O-T contains multiple words:
        // TOPS (4-letter, reverse) = T(1) + O(1) + P(3) + S(1) = 6
        // POT (3-letter) = P(3) + O(1) + T(1) = 5
        // TOP (3-letter, reverse) = T(1) + O(1) + P(3) = 5
        // Total = 16
        block(0, 7, 'S', true),
        block(1, 7, 'P', true),
        block(2, 7, 'O', true),
        block(3, 7, 'T', true),
      ],
    })

    const result = processChainReaction(state, 1)

    expect(result.wordsFound).toContain('TOPS')
    expect(result.wordsFound).toContain('POT')
    expect(result.wordsFound).toContain('TOP')
    expect(result.score).toBe(16)
  })

  test('S-P-O-T with streak multiplier applies to all words', () => {
    const state = createTestState({
      blocks: [
        block(0, 7, 'S', true),
        block(1, 7, 'P', true),
        block(2, 7, 'O', true),
        block(3, 7, 'T', true),
      ],
    })

    const result = processChainReaction(state, 3) // streak = 3

    // Base 16 * streak 3 = 48
    expect(result.score).toBe(48)
  })

  test('longer sequences find more sub-words', () => {
    const state = createTestState({
      blocks: [
        // S-T-O-P-S contains overlapping words:
        // STOPS, POTS, TOPS, STOP, POT, TOP, etc.
        block(0, 7, 'S', true),
        block(1, 7, 'T', true),
        block(2, 7, 'O', true),
        block(3, 7, 'P', true),
        block(4, 7, 'S', true),
      ],
    })

    const result = processChainReaction(state, 1)

    // Should find multiple overlapping words
    expect(result.wordsFound.length).toBeGreaterThanOrEqual(4)
    expect(result.score).toBeGreaterThan(16) // More than S-P-O-T alone
  })
})

describe('Scoring Formula Verification', () => {
  test('formula: base × streak × chain', () => {
    // Verify the scoring formula with calculateWordScore directly
    // CAT = C(3) + A(1) + T(1) = 5 base

    // Streak 1, Chain 1
    expect(calculateWordScore('CAT', { chainMultiplier: 1, streakMultiplier: 1 })).toBe(5)

    // Streak 2, Chain 1
    expect(calculateWordScore('CAT', { chainMultiplier: 1, streakMultiplier: 2 })).toBe(10)

    // Streak 1, Chain 2
    expect(calculateWordScore('CAT', { chainMultiplier: 2, streakMultiplier: 1 })).toBe(10)

    // Streak 2, Chain 2
    expect(calculateWordScore('CAT', { chainMultiplier: 2, streakMultiplier: 2 })).toBe(20)

    // Streak 3, Chain 2
    expect(calculateWordScore('CAT', { chainMultiplier: 2, streakMultiplier: 3 })).toBe(30)

    // Streak 5, Chain 3
    expect(calculateWordScore('CAT', { chainMultiplier: 3, streakMultiplier: 5 })).toBe(75)
  })

  test('words use Scrabble letter point values', () => {
    // QUIZ = Q(10) + U(1) + I(1) + Z(10) = 22 base (just Scrabble values, no special bonus)
    expect(calculateWordScore('QUIZ', { chainMultiplier: 1, streakMultiplier: 1 })).toBe(22)
    expect(calculateWordScore('QUIZ', { chainMultiplier: 1, streakMultiplier: 2 })).toBe(44)
    expect(calculateWordScore('QUIZ', { chainMultiplier: 2, streakMultiplier: 2 })).toBe(88)
  })
})
