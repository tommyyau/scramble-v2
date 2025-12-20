import { Block, GameState } from '../types'
import { GRID_WIDTH, GRID_HEIGHT } from '../constants'

/**
 * Check if a position is within grid boundaries
 */
export function isPositionValid(x: number, y: number): boolean {
  return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT
}

/**
 * Check if a position is occupied by a block
 */
export function isPositionOccupied(blocks: Block[], x: number, y: number): boolean {
  return blocks.some(b => b.x === x && b.y === y)
}

/**
 * Get block at specific position
 */
export function getBlockAt(blocks: Block[], x: number, y: number): Block | undefined {
  return blocks.find(b => b.x === x && b.y === y)
}

/**
 * Check if active block can move in a direction
 */
export function canMove(blocks: Block[], direction: 'left' | 'right' | 'down'): boolean {
  const activeBlock = blocks.find(b => !b.locked)
  if (!activeBlock) return false

  let newX = activeBlock.x
  let newY = activeBlock.y

  switch (direction) {
    case 'left':
      newX = activeBlock.x - 1
      break
    case 'right':
      newX = activeBlock.x + 1
      break
    case 'down':
      newY = activeBlock.y + 1
      break
  }

  // Check boundaries
  if (!isPositionValid(newX, newY)) {
    return false
  }

  // Check collision with other locked blocks
  const lockedBlocks = blocks.filter(b => b.locked)
  return !isPositionOccupied(lockedBlocks, newX, newY)
}

/**
 * Move the active block left or right
 */
export function moveBlock(state: GameState, direction: 'left' | 'right'): GameState {
  const activeBlock = state.blocks.find(b => !b.locked)
  if (!activeBlock) return state

  if (!canMove(state.blocks, direction)) {
    return state
  }

  const delta = direction === 'left' ? -1 : 1
  const newX = activeBlock.x + delta

  return {
    ...state,
    blocks: state.blocks.map(b =>
      b === activeBlock ? { ...b, x: newX } : b
    ),
  }
}

/**
 * Apply gravity to all locked blocks (make floating blocks fall)
 */
export function applyGravity(state: GameState): GameState {
  let blocks = [...state.blocks]
  let changed = true

  // Keep applying gravity until no more changes
  while (changed) {
    changed = false

    // Process each column
    for (let x = 0; x < GRID_WIDTH; x++) {
      // Get blocks in this column, sorted by y (bottom to top)
      const columnBlocks = blocks
        .filter(b => b.x === x && b.locked)
        .sort((a, b) => b.y - a.y)

      // Process each block in the column
      for (const block of columnBlocks) {
        const newY = block.y + 1

        // Check if block can fall
        if (newY < GRID_HEIGHT && !blocks.some(b => b.x === x && b.y === newY && b !== block)) {
          // Move block down
          blocks = blocks.map(b => (b === block ? { ...b, y: newY } : b))
          changed = true
        }
      }
    }
  }

  return { ...state, blocks }
}

/**
 * Hard drop - instantly drop active block to bottom
 */
export function hardDrop(state: GameState): GameState {
  const activeBlock = state.blocks.find(b => !b.locked)
  if (!activeBlock) return state

  // Find the lowest position this block can reach
  let targetY = activeBlock.y
  const lockedBlocks = state.blocks.filter(b => b.locked)

  while (targetY < GRID_HEIGHT - 1) {
    const nextY = targetY + 1
    if (isPositionOccupied(lockedBlocks, activeBlock.x, nextY)) {
      break
    }
    targetY = nextY
  }

  return {
    ...state,
    blocks: state.blocks.map(b =>
      b === activeBlock ? { ...b, y: targetY, locked: true } : b
    ),
  }
}

/**
 * Remove specified blocks from the grid
 */
export function removeBlocks(blocks: Block[], toRemove: Block[]): Block[] {
  const removeSet = new Set(toRemove)
  return blocks.filter(b => !removeSet.has(b))
}
