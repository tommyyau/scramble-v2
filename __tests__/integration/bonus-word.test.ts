import { describe, test, expect } from 'vitest'
import { block, createTestState } from '../setup'
import { processChainReaction } from '../../src/lib/engine/chains'
import { calculateWordScore } from '../../src/lib/engine/scoring'
import { getRandomBonusWord, isBonusWordMatch, BONUS_WORD_MULTIPLIER } from '../../src/lib/engine/bonus-word'
import { createInitialState } from '../../src/lib/engine/core'

describe('Bonus Word Generation', () => {
  test('getRandomBonusWord returns a 5-letter word', () => {
    const word = getRandomBonusWord()
    expect(word).toHaveLength(5)
  })

  test('getRandomBonusWord returns different words on multiple calls', () => {
    const words = new Set<string>()
    for (let i = 0; i < 100; i++) {
      words.add(getRandomBonusWord())
    }
    // Should have at least a few different words
    expect(words.size).toBeGreaterThan(5)
  })

  test('initial game state includes a bonus word', () => {
    const state = createInitialState('classic')
    expect(state.currentBonusWord).toBeTruthy()
    expect(state.currentBonusWord).toHaveLength(5)
  })
})

describe('Bonus Word Matching', () => {
  test('isBonusWordMatch returns true for exact match', () => {
    expect(isBonusWordMatch('HELLO', 'HELLO')).toBe(true)
  })

  test('isBonusWordMatch is case insensitive', () => {
    expect(isBonusWordMatch('hello', 'HELLO')).toBe(true)
    expect(isBonusWordMatch('HELLO', 'hello')).toBe(true)
  })

  test('isBonusWordMatch returns false for non-match', () => {
    expect(isBonusWordMatch('HELLO', 'WORLD')).toBe(false)
  })

  test('isBonusWordMatch returns false for null bonus word', () => {
    expect(isBonusWordMatch('HELLO', null)).toBe(false)
  })

  test('isBonusWordMatch returns false for partial match', () => {
    expect(isBonusWordMatch('HELL', 'HELLO')).toBe(false)
    expect(isBonusWordMatch('HELLO', 'HELL')).toBe(false)
  })
})

describe('Bonus Word Scoring', () => {
  test('bonus multiplier is 3x', () => {
    expect(BONUS_WORD_MULTIPLIER).toBe(3)
  })

  test('bonus word gets 3x score multiplier', () => {
    // HELLO = H(4) + E(1) + L(1) + L(1) + O(1) = 8 base
    const normalScore = calculateWordScore('HELLO', { chainMultiplier: 1 })
    const bonusScore = calculateWordScore('HELLO', { chainMultiplier: 1, bonusMultiplier: 3 })

    expect(bonusScore).toBe(normalScore * 3)
  })

  test('bonus multiplier stacks with streak multiplier', () => {
    // HELLO base = 8
    // With streak 2 = 16
    // With bonus 3x = 48
    const score = calculateWordScore('HELLO', {
      chainMultiplier: 1,
      streakMultiplier: 2,
      bonusMultiplier: 3
    })

    expect(score).toBe(48)
  })

  test('bonus multiplier stacks with chain multiplier', () => {
    // HELLO base = 8
    // With chain 2 = 16
    // With bonus 3x = 48
    const score = calculateWordScore('HELLO', {
      chainMultiplier: 2,
      streakMultiplier: 1,
      bonusMultiplier: 3
    })

    expect(score).toBe(48)
  })

  test('all multipliers stack: streak × chain × bonus', () => {
    // HELLO base = 8
    // With streak 2 = 16
    // With chain 2 = 32
    // With bonus 3x = 96
    const score = calculateWordScore('HELLO', {
      chainMultiplier: 2,
      streakMultiplier: 2,
      bonusMultiplier: 3
    })

    expect(score).toBe(96)
  })
})

describe('Bonus Word in Chain Processing', () => {
  test('processChainReaction detects bonus word match', () => {
    const state = createTestState({
      currentBonusWord: 'HELLO',
      blocks: [
        block(0, 7, 'H', true),
        block(1, 7, 'E', true),
        block(2, 7, 'L', true),
        block(3, 7, 'L', true),
        block(4, 7, 'O', true),
      ],
    })

    const result = processChainReaction(state, 1)

    expect(result.bonusWordMatched).toBe(true)
    expect(result.wordsFound).toContain('HELLO')
  })

  test('processChainReaction gives 3x score for bonus word', () => {
    const state = createTestState({
      currentBonusWord: 'HELLO',
      blocks: [
        block(0, 7, 'H', true),
        block(1, 7, 'E', true),
        block(2, 7, 'L', true),
        block(3, 7, 'L', true),
        block(4, 7, 'O', true),
      ],
    })

    const result = processChainReaction(state, 1)

    // HELLO = 8 base, with bonus 3x = 24
    // HELL = 7 base (sub-word, no bonus)
    // Total = 24 + 7 = 31
    expect(result.score).toBe(31)
  })

  test('processChainReaction returns bonusWordMatched=false for non-bonus word', () => {
    const state = createTestState({
      currentBonusWord: 'WORLD',
      blocks: [
        // CAT is not the bonus word
        block(0, 7, 'C', true),
        block(1, 7, 'A', true),
        block(2, 7, 'T', true),
      ],
    })

    const result = processChainReaction(state, 1)

    expect(result.bonusWordMatched).toBe(false)
    expect(result.score).toBe(5) // Normal score, no bonus
  })

  test('bonus word with streak multiplier gives combined bonus', () => {
    const state = createTestState({
      currentBonusWord: 'HELLO',
      blocks: [
        block(0, 7, 'H', true),
        block(1, 7, 'E', true),
        block(2, 7, 'L', true),
        block(3, 7, 'L', true),
        block(4, 7, 'O', true),
      ],
    })

    const result = processChainReaction(state, 3) // streak = 3

    // HELLO = 8 base, streak 3 = 24, bonus 3x = 72
    // HELL = 7 base, streak 3 = 21 (sub-word, no bonus)
    // Total = 72 + 21 = 93
    expect(result.score).toBe(93)
    expect(result.bonusWordMatched).toBe(true)
  })

  test('bonus word null does not cause errors', () => {
    const state = createTestState({
      currentBonusWord: null,
      blocks: [
        block(0, 7, 'C', true),
        block(1, 7, 'A', true),
        block(2, 7, 'T', true),
      ],
    })

    const result = processChainReaction(state, 1)

    expect(result.bonusWordMatched).toBe(false)
    expect(result.score).toBe(5)
  })
})
