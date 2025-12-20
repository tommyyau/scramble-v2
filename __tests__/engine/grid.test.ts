import { describe, test, expect } from 'vitest'
import { block, createTestState } from '../setup'
import {
  moveBlock,
  canMove,
  applyGravity,
  hardDrop,
  getBlockAt,
  isPositionValid,
  isPositionOccupied,
  removeBlocks,
} from '../../src/lib/engine/grid'
import { GRID_WIDTH, GRID_HEIGHT } from '../../src/lib/constants'

describe('Block Movement', () => {
  test('block moves left when space available', () => {
    const state = createTestState({
      blocks: [block(4, 5, 'A', false)],
    })

    const newState = moveBlock(state, 'left')
    expect(newState.blocks[0].x).toBe(3)
  })

  test('block moves right when space available', () => {
    const state = createTestState({
      blocks: [block(4, 5, 'A', false)],
    })

    const newState = moveBlock(state, 'right')
    expect(newState.blocks[0].x).toBe(5)
  })

  test('block cannot move past left edge', () => {
    const state = createTestState({
      blocks: [block(0, 5, 'A', false)],
    })

    const newState = moveBlock(state, 'left')
    expect(newState.blocks[0].x).toBe(0)
  })

  test('block cannot move past right edge', () => {
    const state = createTestState({
      blocks: [block(GRID_WIDTH - 1, 5, 'A', false)],
    })

    const newState = moveBlock(state, 'right')
    expect(newState.blocks[0].x).toBe(GRID_WIDTH - 1)
  })

  test('block cannot move into occupied cell (left)', () => {
    const state = createTestState({
      blocks: [
        block(4, 5, 'A', false),
        block(3, 5, 'B', true),
      ],
    })

    const newState = moveBlock(state, 'left')
    expect(newState.blocks.find(b => b.letter === 'A')?.x).toBe(4)
  })

  test('block cannot move into occupied cell (right)', () => {
    const state = createTestState({
      blocks: [
        block(4, 5, 'A', false),
        block(5, 5, 'B', true),
      ],
    })

    const newState = moveBlock(state, 'right')
    expect(newState.blocks.find(b => b.letter === 'A')?.x).toBe(4)
  })

  test('locked blocks do not move', () => {
    const state = createTestState({
      blocks: [block(4, 5, 'A', true)],
    })

    const newState = moveBlock(state, 'left')
    expect(newState.blocks[0].x).toBe(4)
  })
})

describe('canMove', () => {
  test('returns true when move is valid', () => {
    const blocks = [block(4, 5, 'A', false)]
    expect(canMove(blocks, 'left')).toBe(true)
    expect(canMove(blocks, 'right')).toBe(true)
    expect(canMove(blocks, 'down')).toBe(true)
  })

  test('returns false at left edge', () => {
    const blocks = [block(0, 5, 'A', false)]
    expect(canMove(blocks, 'left')).toBe(false)
  })

  test('returns false at right edge', () => {
    const blocks = [block(GRID_WIDTH - 1, 5, 'A', false)]
    expect(canMove(blocks, 'right')).toBe(false)
  })

  test('returns false at bottom', () => {
    const blocks = [block(4, GRID_HEIGHT - 1, 'A', false)]
    expect(canMove(blocks, 'down')).toBe(false)
  })

  test('returns false when blocked by another block', () => {
    const blocks = [
      block(4, 5, 'A', false),
      block(3, 5, 'B', true),
    ]
    expect(canMove(blocks, 'left')).toBe(false)
  })
})

describe('Gravity', () => {
  test('gravity drops floating blocks', () => {
    const state = createTestState({
      blocks: [
        block(2, 3, 'A', true), // Floating in the middle
      ],
    })

    const newState = applyGravity(state)
    expect(newState.blocks[0].y).toBe(GRID_HEIGHT - 1) // Dropped to bottom
  })

  test('gravity drops blocks to rest on other blocks', () => {
    const state = createTestState({
      blocks: [
        block(2, 3, 'A', true), // Floating
        block(2, 7, 'B', true), // At bottom
      ],
    })

    const newState = applyGravity(state)
    expect(newState.blocks.find(b => b.letter === 'A')?.y).toBe(6) // Rests on B
    expect(newState.blocks.find(b => b.letter === 'B')?.y).toBe(7) // Unchanged
  })

  test('gravity handles multiple floating blocks in same column', () => {
    const state = createTestState({
      blocks: [
        block(2, 2, 'A', true), // Floating high
        block(2, 4, 'B', true), // Floating lower
      ],
    })

    const newState = applyGravity(state)
    // B should be at bottom, A should be on top of B
    expect(newState.blocks.find(b => b.letter === 'B')?.y).toBe(GRID_HEIGHT - 1)
    expect(newState.blocks.find(b => b.letter === 'A')?.y).toBe(GRID_HEIGHT - 2)
  })

  test('gravity does not affect blocks at bottom', () => {
    const state = createTestState({
      blocks: [block(2, GRID_HEIGHT - 1, 'A', true)],
    })

    const newState = applyGravity(state)
    expect(newState.blocks[0].y).toBe(GRID_HEIGHT - 1)
  })

  test('gravity handles multiple columns independently', () => {
    const state = createTestState({
      blocks: [
        block(0, 3, 'A', true),
        block(1, 5, 'B', true),
        block(2, 7, 'C', true), // Already at bottom
      ],
    })

    const newState = applyGravity(state)
    expect(newState.blocks.find(b => b.letter === 'A')?.y).toBe(GRID_HEIGHT - 1)
    expect(newState.blocks.find(b => b.letter === 'B')?.y).toBe(GRID_HEIGHT - 1)
    expect(newState.blocks.find(b => b.letter === 'C')?.y).toBe(GRID_HEIGHT - 1)
  })
})

describe('Hard Drop', () => {
  test('hard drop moves block to bottom instantly', () => {
    const state = createTestState({
      blocks: [block(4, 0, 'A', false)],
    })

    const newState = hardDrop(state)
    expect(newState.blocks[0].y).toBe(GRID_HEIGHT - 1)
    expect(newState.blocks[0].locked).toBe(true)
  })

  test('hard drop lands on other blocks', () => {
    const state = createTestState({
      blocks: [
        block(4, 0, 'A', false),
        block(4, 7, 'B', true),
      ],
    })

    const newState = hardDrop(state)
    expect(newState.blocks.find(b => b.letter === 'A')?.y).toBe(6)
    expect(newState.blocks.find(b => b.letter === 'A')?.locked).toBe(true)
  })

  test('hard drop does nothing when no active block', () => {
    const state = createTestState({
      blocks: [block(4, 7, 'A', true)],
    })

    const newState = hardDrop(state)
    expect(newState).toEqual(state)
  })
})

describe('Position Utilities', () => {
  test('getBlockAt returns block at position', () => {
    const blocks = [
      block(2, 3, 'A', true),
      block(4, 5, 'B', true),
    ]

    expect(getBlockAt(blocks, 2, 3)?.letter).toBe('A')
    expect(getBlockAt(blocks, 4, 5)?.letter).toBe('B')
    expect(getBlockAt(blocks, 0, 0)).toBeUndefined()
  })

  test('isPositionValid checks grid boundaries', () => {
    expect(isPositionValid(0, 0)).toBe(true)
    expect(isPositionValid(GRID_WIDTH - 1, GRID_HEIGHT - 1)).toBe(true)
    expect(isPositionValid(-1, 0)).toBe(false)
    expect(isPositionValid(0, -1)).toBe(false)
    expect(isPositionValid(GRID_WIDTH, 0)).toBe(false)
    expect(isPositionValid(0, GRID_HEIGHT)).toBe(false)
  })

  test('isPositionOccupied checks if position has block', () => {
    const blocks = [block(2, 3, 'A', true)]

    expect(isPositionOccupied(blocks, 2, 3)).toBe(true)
    expect(isPositionOccupied(blocks, 0, 0)).toBe(false)
  })
})

describe('Remove Blocks', () => {
  test('removeBlocks removes specified blocks', () => {
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
      block(2, 7, 'T', true),
      block(3, 7, 'S', true),
    ]

    const toRemove = [blocks[0], blocks[1], blocks[2]] // Remove C, A, T
    const remaining = removeBlocks(blocks, toRemove)

    expect(remaining).toHaveLength(1)
    expect(remaining[0].letter).toBe('S')
  })

  test('removeBlocks with empty array returns all blocks', () => {
    const blocks = [
      block(0, 7, 'A', true),
      block(1, 7, 'B', true),
    ]

    const remaining = removeBlocks(blocks, [])
    expect(remaining).toEqual(blocks)
  })
})
