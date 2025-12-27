import { describe, test, expect } from 'vitest'
import { block, row, createTestState } from '../setup'
import { processBlockLocked, BlockLockedResult } from '../../src/lib/engine/game-flow'
import { applyGravity } from '../../src/lib/engine/grid'
import { GRID_HEIGHT } from '../../src/lib/constants'

/**
 * Tests for processBlockLocked - the unified function that handles
 * all word detection, gravity, and scoring after a block locks.
 *
 * This function consolidates logic from drop(), gameTick(), and endCelebration().
 */
describe('processBlockLocked', () => {
  describe('basic word detection', () => {
    test('detects horizontal word when block locks', () => {
      // CAT at bottom row
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 1, 'C'),
          block(1, GRID_HEIGHT - 1, 'A'),
          block(2, GRID_HEIGHT - 1, 'T'),
        ],
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      expect(result.wordsFound).toContain('CAT')
      expect(result.chainCount).toBe(1)
      expect(result.score).toBeGreaterThan(0)
    })

    test('detects vertical word when block locks', () => {
      // CAT vertically
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 3, 'C'),
          block(0, GRID_HEIGHT - 2, 'A'),
          block(0, GRID_HEIGHT - 1, 'T'),
        ],
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      expect(result.wordsFound).toContain('CAT')
      expect(result.chainCount).toBe(1)
    })

    test('returns empty result when no words found', () => {
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 1, 'X'),
          block(2, GRID_HEIGHT - 1, 'Y'), // Gap - no word
          block(4, GRID_HEIGHT - 1, 'Z'),
        ],
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      expect(result.wordsFound).toHaveLength(0)
      expect(result.chainCount).toBe(0)
      expect(result.score).toBe(0)
    })
  })

  describe('gravity and chain detection', () => {
    test('applies gravity after clearing words', () => {
      // DOG at bottom, X floating above D
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 3, 'X'), // Will fall after DOG clears
          block(0, GRID_HEIGHT - 1, 'D'),
          block(1, GRID_HEIGHT - 1, 'O'),
          block(2, GRID_HEIGHT - 1, 'G'),
        ],
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      expect(result.wordsFound).toContain('DOG')
      // X should have fallen to bottom
      const xBlock = result.state.blocks.find(b => b.letter === 'X')
      expect(xBlock?.y).toBe(GRID_HEIGHT - 1)
    })

    test('detects gravity-formed words (chains)', () => {
      // Setup: O-I floating, L at bottom
      // After gravity: O-I-L forms vertically
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 5, 'O'), // Will fall
          block(0, GRID_HEIGHT - 4, 'I'), // Will fall
          block(0, GRID_HEIGHT - 1, 'L'), // At bottom
        ],
      })

      // Apply gravity first (simulating block lock with no initial words)
      const withGravity = applyGravity(state)
      const result = processBlockLocked(withGravity, { streakMultiplier: 1 })

      expect(result.wordsFound).toContain('OIL')
      expect(result.chainCount).toBeGreaterThanOrEqual(1)
    })

    test('handles multi-level chain reactions', () => {
      // Setup: DOG at bottom, CAT above it
      // Clear DOG -> CAT falls -> may form new word
      const state = createTestState({
        blocks: [
          // CAT above DOG (will fall after DOG clears)
          block(0, GRID_HEIGHT - 2, 'C'),
          block(1, GRID_HEIGHT - 2, 'A'),
          block(2, GRID_HEIGHT - 2, 'T'),
          // DOG at bottom (will be cleared)
          block(0, GRID_HEIGHT - 1, 'D'),
          block(1, GRID_HEIGHT - 1, 'O'),
          block(2, GRID_HEIGHT - 1, 'G'),
        ],
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      // Should find both DOG and CAT
      expect(result.wordsFound).toContain('DOG')
      expect(result.wordsFound).toContain('CAT')
      expect(result.chainCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('scoring with multipliers', () => {
    test('calculates score with streak multiplier', () => {
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 1, 'C'),
          block(1, GRID_HEIGHT - 1, 'A'),
          block(2, GRID_HEIGHT - 1, 'T'),
        ],
      })

      const result1x = processBlockLocked(state, { streakMultiplier: 1 })
      const result2x = processBlockLocked(state, { streakMultiplier: 2 })

      expect(result2x.score).toBeGreaterThan(result1x.score)
    })

    test('calculates chain multiplier for gravity words', () => {
      // Setup that causes a chain
      const state = createTestState({
        blocks: [
          // CAT above DOG
          block(0, GRID_HEIGHT - 2, 'C'),
          block(1, GRID_HEIGHT - 2, 'A'),
          block(2, GRID_HEIGHT - 2, 'T'),
          // DOG at bottom
          block(0, GRID_HEIGHT - 1, 'D'),
          block(1, GRID_HEIGHT - 1, 'O'),
          block(2, GRID_HEIGHT - 1, 'G'),
        ],
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      // Chain words should have multipliers
      expect(result.chainMultipliers.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('bonus word handling', () => {
    test('detects bonus word match', () => {
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 1, 'C'),
          block(1, GRID_HEIGHT - 1, 'A'),
          block(2, GRID_HEIGHT - 1, 'T'),
        ],
        currentBonusWord: 'CAT',
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      expect(result.bonusWordMatched).toBe(true)
    })

    test('returns false for non-bonus words', () => {
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 1, 'D'),
          block(1, GRID_HEIGHT - 1, 'O'),
          block(2, GRID_HEIGHT - 1, 'G'),
        ],
        currentBonusWord: 'CAT',
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      expect(result.bonusWordMatched).toBe(false)
    })
  })

  describe('particle and UI data', () => {
    test('returns clearedPositions for particle effects', () => {
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 1, 'C'),
          block(1, GRID_HEIGHT - 1, 'A'),
          block(2, GRID_HEIGHT - 1, 'T'),
        ],
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      expect(result.clearedPositions.length).toBe(3) // 3 letters cleared
      expect(result.clearedPositions[0]).toHaveProperty('x')
      expect(result.clearedPositions[0]).toHaveProperty('y')
      expect(result.clearedPositions[0]).toHaveProperty('color')
    })

    test('returns wordsWithScores for history', () => {
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 1, 'C'),
          block(1, GRID_HEIGHT - 1, 'A'),
          block(2, GRID_HEIGHT - 1, 'T'),
        ],
      })

      const result = processBlockLocked(state, { streakMultiplier: 2 })

      expect(result.wordsWithScores.length).toBeGreaterThan(0)
      const catWord = result.wordsWithScores.find(w => w.word === 'CAT')
      expect(catWord).toBeDefined()
      expect(catWord!.score).toBeGreaterThan(0)
      expect(catWord!.streakMultiplier).toBe(2)
    })
  })

  describe('state updates', () => {
    test('returns updated state with cleared blocks removed', () => {
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 1, 'C'),
          block(1, GRID_HEIGHT - 1, 'A'),
          block(2, GRID_HEIGHT - 1, 'T'),
          block(5, GRID_HEIGHT - 1, 'X'), // Unrelated block
        ],
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      // CAT cleared, X remains
      expect(result.state.blocks.length).toBe(1)
      expect(result.state.blocks[0].letter).toBe('X')
    })

    test('updates wordsFound in returned state', () => {
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 1, 'C'),
          block(1, GRID_HEIGHT - 1, 'A'),
          block(2, GRID_HEIGHT - 1, 'T'),
        ],
        wordsFound: ['DOG'], // Previous word
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      expect(result.state.wordsFound).toContain('DOG')
      expect(result.state.wordsFound).toContain('CAT')
    })

    test('updates score in returned state', () => {
      const state = createTestState({
        blocks: [
          block(0, GRID_HEIGHT - 1, 'C'),
          block(1, GRID_HEIGHT - 1, 'A'),
          block(2, GRID_HEIGHT - 1, 'T'),
        ],
        score: 100, // Previous score
      })

      const result = processBlockLocked(state, { streakMultiplier: 1 })

      expect(result.state.score).toBeGreaterThan(100)
    })
  })
})
