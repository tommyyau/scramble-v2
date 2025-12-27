import { describe, test, expect } from 'vitest'
import { block, createTestState } from '../setup'
import { createInitialState, spawnBlock, tick } from '../../src/lib/engine/core'
import { moveBlock, hardDrop, applyGravity } from '../../src/lib/engine/grid'
import { checkAndClearWords, findWords } from '../../src/lib/engine/words'
import { processChainReaction } from '../../src/lib/engine/chains'
import { GRID_HEIGHT, SPAWN_POSITION } from '../../src/lib/constants'

describe('Complete Word Formation Flow', () => {
  test('form CAT horizontally and clear', () => {
    let state = createInitialState('classic')

    // Spawn and drop C at position 0
    state = spawnBlock(state, 'C')
    state = moveBlock(state, 'left')
    state = moveBlock(state, 'left')
    state = moveBlock(state, 'left')
    state = moveBlock(state, 'left')
    state = hardDrop(state)

    // Spawn and drop A at position 1
    state = spawnBlock(state, 'A')
    state = moveBlock(state, 'left')
    state = moveBlock(state, 'left')
    state = moveBlock(state, 'left')
    state = hardDrop(state)

    // Spawn and drop T at position 2
    state = spawnBlock(state, 'T')
    state = moveBlock(state, 'left')
    state = moveBlock(state, 'left')
    state = hardDrop(state)

    // Check for words and clear
    state = checkAndClearWords(state)

    // Verify word was found and cleared
    expect(state.wordsFound).toContain('CAT')
    expect(state.score).toBeGreaterThan(0)

    // Blocks should be cleared
    expect(state.blocks).toHaveLength(0)
  })

  test('form word vertically and clear', () => {
    let state = createTestState({
      blocks: [
        // C-A-T vertically at column 0
        block(0, 5, 'C', true),
        block(0, 6, 'A', true),
        block(0, 7, 'T', true),
      ],
    })

    state = checkAndClearWords(state)

    expect(state.wordsFound).toContain('CAT')
    expect(state.blocks).toHaveLength(0)
  })

  test('partial clear with remaining blocks', () => {
    let state = createTestState({
      blocks: [
        block(0, 7, 'C', true),
        block(1, 7, 'A', true),
        block(2, 7, 'T', true),
        block(5, 7, 'X', true), // Not part of word
        block(6, 7, 'Y', true),
        block(7, 7, 'Z', true),
      ],
    })

    state = checkAndClearWords(state)

    expect(state.wordsFound).toContain('CAT')
    expect(state.blocks).toHaveLength(3) // X, Y, Z remain
  })
})

describe('Gravity After Clearing', () => {
  test('blocks fall after word is cleared below them', () => {
    // Set up:
    // Row 6: X (above the word)
    // Row 7: CAT (to be cleared)
    let state = createTestState({
      blocks: [
        block(0, 6, 'X', true), // Floating above C
        block(0, 7, 'C', true),
        block(1, 7, 'A', true),
        block(2, 7, 'T', true),
      ],
    })

    // Clear the word
    state = checkAndClearWords(state)
    expect(state.wordsFound).toContain('CAT')

    // Apply gravity
    state = applyGravity(state)

    // X should have fallen to the bottom
    const blockX = state.blocks.find(b => b.letter === 'X')
    expect(blockX?.y).toBe(GRID_HEIGHT - 1)
  })

  test('multiple floating blocks fall correctly', () => {
    let state = createTestState({
      blocks: [
        // Top blocks that will fall
        block(0, 4, 'A', true),
        block(1, 4, 'B', true),
        block(2, 4, 'C', true),
        // Word to clear
        block(0, 7, 'D', true),
        block(1, 7, 'O', true),
        block(2, 7, 'G', true),
      ],
    })

    state = checkAndClearWords(state)
    state = applyGravity(state)

    // All top blocks should have fallen
    expect(state.blocks.find(b => b.letter === 'A')?.y).toBe(GRID_HEIGHT - 1)
    expect(state.blocks.find(b => b.letter === 'B')?.y).toBe(GRID_HEIGHT - 1)
    expect(state.blocks.find(b => b.letter === 'C')?.y).toBe(GRID_HEIGHT - 1)
  })
})

describe('Game Progression', () => {
  test('score accumulates across multiple words', () => {
    let state = createInitialState('classic')

    // First word: CAT
    state = { ...state, blocks: [block(0, 7, 'C', true), block(1, 7, 'A', true), block(2, 7, 'T', true)] }
    state = checkAndClearWords(state)
    const scoreAfterFirst = state.score

    // Second word: DOG
    state = { ...state, blocks: [...state.blocks, block(0, 7, 'D', true), block(1, 7, 'O', true), block(2, 7, 'G', true)] }
    state = checkAndClearWords(state)

    expect(state.score).toBeGreaterThan(scoreAfterFirst)
    expect(state.wordsFound).toContain('CAT')
    expect(state.wordsFound).toContain('DOG')
  })

  test('words found list grows', () => {
    let state = createInitialState('classic')

    state = { ...state, blocks: [block(0, 7, 'C', true), block(1, 7, 'A', true), block(2, 7, 'T', true)] }
    state = checkAndClearWords(state)
    expect(state.wordsFound).toHaveLength(1)
    expect(state.wordsFound).toContain('CAT')

    state = { ...state, blocks: [...state.blocks, block(0, 7, 'D', true), block(1, 7, 'O', true), block(2, 7, 'G', true)] }
    state = checkAndClearWords(state)
    // DOG and GOD are both valid words, so the list grows by 2
    expect(state.wordsFound.length).toBeGreaterThanOrEqual(2)
    expect(state.wordsFound).toContain('CAT')
    expect(state.wordsFound).toContain('DOG')
  })
})

describe('Block Landing', () => {
  test('block lands on bottom row', () => {
    let state = createInitialState('classic')
    state = spawnBlock(state, 'A')

    // Tick until landed
    while (state.blocks.some(b => !b.locked)) {
      state = tick(state)
    }

    const landedBlock = state.blocks[0]
    expect(landedBlock.y).toBe(GRID_HEIGHT - 1)
    expect(landedBlock.locked).toBe(true)
  })

  test('block lands on existing block', () => {
    let state = createTestState({
      blocks: [block(SPAWN_POSITION.x, GRID_HEIGHT - 1, 'X', true)],
    })

    state = spawnBlock(state, 'A')

    // Tick until landed
    while (state.blocks.some(b => !b.locked)) {
      state = tick(state)
    }

    const blockA = state.blocks.find(b => b.letter === 'A')
    expect(blockA?.y).toBe(GRID_HEIGHT - 2)
    expect(blockA?.locked).toBe(true)
  })
})

describe('Gravity Word Detection', () => {
  test('words formed by gravity should be detected immediately', () => {
    // Bug scenario: Block locks, no words found, gravity applied,
    // blocks fall into word positions but word NOT detected until next block
    //
    // Setup:
    // - "OI" floating at row 3 with empty space below
    // - "L" at row 7 (bottom)
    // - New block locks at row 6 (to the right, not forming a word)
    // - Gravity makes "OI" fall to rows 5-6
    // - "OIL" forms vertically but bug: not detected!
    //
    // Grid visualization:
    //   Col: 0 1 2 3 4 5 6 7
    //   Row 3: O
    //   Row 4: I
    //   Row 5:
    //   Row 6:         X     <- New block locks here
    //   Row 7: L             <- Bottom
    //
    // After gravity on OI (assuming X locks and OI falls):
    //   Row 5: O
    //   Row 6: I   X
    //   Row 7: L             <- OIL forms vertically!

    let state = createTestState({
      blocks: [
        block(0, 3, 'O', true),  // Will fall
        block(0, 4, 'I', true),  // Will fall
        block(0, 7, 'L', true),  // At bottom
        block(4, 7, 'X', true),  // Some other block at bottom
      ],
    })

    // Simulate what happens in gameTick when no words found:
    // Apply gravity - O and I should fall
    state = applyGravity(state)

    // After gravity: O is at row 5, I is at row 6, L at row 7 = "OIL" vertically
    const blockO = state.blocks.find(b => b.letter === 'O')
    const blockI = state.blocks.find(b => b.letter === 'I')
    const blockL = state.blocks.find(b => b.letter === 'L')

    expect(blockO?.y).toBe(5)  // O fell to row 5
    expect(blockI?.y).toBe(6)  // I fell to row 6
    expect(blockL?.y).toBe(7)  // L stayed at row 7

    // Now check if words are found - this is what SHOULD happen
    // but the bug is that gameTick() doesn't do this check
    const words = findWords(state.blocks)
    const wordTexts = words.map(w => w.word)

    // OIL should be detected!
    expect(wordTexts).toContain('OIL')
  })

  test('processChainReaction handles gravity-formed words correctly', () => {
    // This tests that the engine function works - it's the game store that has the bug
    let state = createTestState({
      blocks: [
        block(0, 3, 'O', true),  // Will fall
        block(0, 4, 'I', true),  // Will fall
        block(0, 7, 'L', true),  // At bottom
      ],
    })

    // Apply gravity first
    state = applyGravity(state)

    // Process chain reaction - should find OIL
    const result = processChainReaction(state)

    expect(result.chainCount).toBeGreaterThan(0)
    expect(result.wordsFound).toContain('OIL')
    expect(result.score).toBeGreaterThan(0)
  })
})

describe('Edge Cases', () => {
  test('no word formed when letters are not adjacent', () => {
    const state = createTestState({
      blocks: [
        block(0, 7, 'C', true),
        block(2, 7, 'A', true), // Gap at position 1
        block(4, 7, 'T', true),
      ],
    })

    const words = findWords(state.blocks)
    expect(words.filter(w => w.word === 'CAT')).toHaveLength(0)
  })

  test('multiple words can form from same position', () => {
    // Intersecting words: CAT horizontal, BAD vertical sharing A
    const state = createTestState({
      blocks: [
        block(0, 6, 'C', true),
        block(1, 6, 'A', true),
        block(2, 6, 'T', true),
        block(1, 5, 'B', true),
        block(1, 7, 'D', true),
      ],
    })

    const words = findWords(state.blocks)
    const wordTexts = words.map(w => w.word)

    expect(wordTexts).toContain('CAT')
    expect(wordTexts).toContain('BAD')
  })
})
