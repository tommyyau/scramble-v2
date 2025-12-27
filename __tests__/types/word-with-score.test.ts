import { describe, test, expect } from 'vitest'
import { WordWithScore } from '../../src/lib/types'

/**
 * Type consistency tests for WordWithScore
 *
 * These tests verify that:
 * 1. WordWithScore is exported from types.ts (compile-time check)
 * 2. The type has all required fields
 * 3. The type shape matches expected structure
 *
 * The real validation is that TypeScript compiles - if any file
 * defines WordWithScore differently, the build will fail.
 */
describe('WordWithScore type', () => {
  test('WordWithScore has required word field', () => {
    const item: WordWithScore = {
      word: 'TEST',
      score: 10,
    }
    expect(item.word).toBe('TEST')
  })

  test('WordWithScore has required score field', () => {
    const item: WordWithScore = {
      word: 'TEST',
      score: 25,
    }
    expect(item.score).toBe(25)
  })

  test('WordWithScore has optional streakMultiplier field', () => {
    const item: WordWithScore = {
      word: 'TEST',
      score: 50,
      streakMultiplier: 2,
    }
    expect(item.streakMultiplier).toBe(2)
  })

  test('WordWithScore has optional chainMultiplier field', () => {
    const item: WordWithScore = {
      word: 'TEST',
      score: 75,
      chainMultiplier: 3,
    }
    expect(item.chainMultiplier).toBe(3)
  })

  test('WordWithScore has optional isBonus field', () => {
    const item: WordWithScore = {
      word: 'TEST',
      score: 45,
      isBonus: true,
    }
    expect(item.isBonus).toBe(true)
  })

  test('WordWithScore works with all optional fields', () => {
    const item: WordWithScore = {
      word: 'BONUS',
      score: 100,
      streakMultiplier: 3,
      chainMultiplier: 2,
      isBonus: true,
    }
    expect(item.word).toBe('BONUS')
    expect(item.score).toBe(100)
    expect(item.streakMultiplier).toBe(3)
    expect(item.chainMultiplier).toBe(2)
    expect(item.isBonus).toBe(true)
  })

  test('WordWithScore works with no optional fields', () => {
    const item: WordWithScore = {
      word: 'SIMPLE',
      score: 15,
    }
    expect(item.streakMultiplier).toBeUndefined()
    expect(item.chainMultiplier).toBeUndefined()
    expect(item.isBonus).toBeUndefined()
  })
})
