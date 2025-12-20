import { describe, test, expect } from 'vitest'
import { block, row, createTestState } from '../setup'
import {
  createInitialState,
  spawnBlock,
  tick,
  lockActiveBlock,
  isGameOver,
  getActiveBlock,
} from '../../src/lib/engine/core'
import { GRID_HEIGHT, SPAWN_POSITION } from '../../src/lib/constants'

describe('Game State', () => {
  test('initial state has empty grid', () => {
    const state = createInitialState('classic')
    expect(state.blocks).toEqual([])
    expect(state.score).toBe(0)
    expect(state.level).toBe(1)
    expect(state.gameOver).toBe(false)
    expect(state.mode).toBe('classic')
  })

  test('initial state generates next letter', () => {
    const state = createInitialState('classic')
    expect(state.nextLetter).toMatch(/^[A-Z]$/)
  })

  test('initial state with zen mode', () => {
    const state = createInitialState('zen')
    expect(state.mode).toBe('zen')
  })

  test('initial state with sprint mode', () => {
    const state = createInitialState('sprint')
    expect(state.mode).toBe('sprint')
  })
})

describe('Block Spawning', () => {
  test('spawning block adds to grid at spawn position', () => {
    const state = createInitialState('classic')
    const newState = spawnBlock(state, 'A')

    expect(newState.blocks).toHaveLength(1)
    expect(newState.blocks[0].x).toBe(SPAWN_POSITION.x)
    expect(newState.blocks[0].y).toBe(SPAWN_POSITION.y)
    expect(newState.blocks[0].letter).toBe('A')
    expect(newState.blocks[0].locked).toBe(false)
  })

  test('spawned block is not locked', () => {
    const state = createInitialState('classic')
    const newState = spawnBlock(state, 'B')

    expect(newState.blocks[0].locked).toBe(false)
  })

  test('spawning generates new next letter', () => {
    const state = createInitialState('classic')
    const originalNext = state.nextLetter
    const newState = spawnBlock(state, originalNext!)

    // New next letter should be generated
    expect(newState.nextLetter).toMatch(/^[A-Z]$/)
  })
})

describe('Game Over Detection', () => {
  test('game over when spawn position is occupied', () => {
    const state = createTestState({
      blocks: [block(SPAWN_POSITION.x, SPAWN_POSITION.y, 'X', true)],
    })

    expect(isGameOver(state)).toBe(true)
  })

  test('not game over when spawn position is free', () => {
    const state = createTestState({
      blocks: [block(0, 7, 'X', true)],
    })

    expect(isGameOver(state)).toBe(false)
  })

  test('not game over with empty grid', () => {
    const state = createTestState()
    expect(isGameOver(state)).toBe(false)
  })

  test('game over when top row is full', () => {
    const state = createTestState({
      blocks: row(0, 'ABCDEFGH'),
    })

    expect(isGameOver(state)).toBe(true)
  })
})

describe('Active Block', () => {
  test('getActiveBlock returns unlocked block', () => {
    const activeBlock = block(4, 2, 'A', false)
    const state = createTestState({
      blocks: [
        block(0, 7, 'X', true),
        activeBlock,
        block(1, 7, 'Y', true),
      ],
    })

    expect(getActiveBlock(state)).toEqual(activeBlock)
  })

  test('getActiveBlock returns undefined when no active block', () => {
    const state = createTestState({
      blocks: [
        block(0, 7, 'X', true),
        block(1, 7, 'Y', true),
      ],
    })

    expect(getActiveBlock(state)).toBeUndefined()
  })
})

describe('Tick (Gravity)', () => {
  test('tick moves active block down by 1', () => {
    const state = createTestState({
      blocks: [block(4, 3, 'A', false)],
    })

    const newState = tick(state)
    expect(newState.blocks[0].y).toBe(4)
    expect(newState.blocks[0].locked).toBe(false)
  })

  test('tick locks block when it reaches bottom', () => {
    const state = createTestState({
      blocks: [block(4, GRID_HEIGHT - 1, 'A', false)],
    })

    const newState = tick(state)
    expect(newState.blocks[0].y).toBe(GRID_HEIGHT - 1)
    expect(newState.blocks[0].locked).toBe(true)
  })

  test('tick locks block when it lands on another block', () => {
    const state = createTestState({
      blocks: [
        block(4, 5, 'A', false),
        block(4, 6, 'B', true),
      ],
    })

    const newState = tick(state)
    // A should be locked, resting on B
    const blockA = newState.blocks.find(b => b.letter === 'A')
    expect(blockA?.y).toBe(5)
    expect(blockA?.locked).toBe(true)
  })

  test('tick does not move locked blocks', () => {
    const state = createTestState({
      blocks: [
        block(0, 7, 'X', true),
        block(1, 7, 'Y', true),
      ],
    })

    const newState = tick(state)
    expect(newState.blocks).toEqual(state.blocks)
  })
})

describe('Lock Active Block', () => {
  test('lockActiveBlock locks the active block', () => {
    const state = createTestState({
      blocks: [block(4, 5, 'A', false)],
    })

    const newState = lockActiveBlock(state)
    expect(newState.blocks[0].locked).toBe(true)
  })

  test('lockActiveBlock does nothing when no active block', () => {
    const state = createTestState({
      blocks: [block(4, 5, 'A', true)],
    })

    const newState = lockActiveBlock(state)
    expect(newState).toEqual(state)
  })
})
