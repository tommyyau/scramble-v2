import { Block, GameState, GameMode } from '../types'
import { SPAWN_POSITION, LETTER_COLORS, GRID_HEIGHT } from '../constants'
import { generateLetter } from './smart-letters'

// Global block ID counter
let blockIdCounter = 0

export function resetBlockIdCounter() {
  blockIdCounter = 0
}

/**
 * Create the initial game state
 */
export function createInitialState(mode: GameMode): GameState {
  const nextLetter = generateLetter([])

  return {
    blocks: [],
    nextLetter,
    score: 0,
    level: 1,
    linesCleared: 0,
    wordsFound: [],
    bonusWordsFound: [],
    bonusWordsTarget: [],
    chainMultiplier: 1,
    gameOver: false,
    isPaused: false,
    mode,
  }
}

/**
 * Spawn a new block at the spawn position
 */
export function spawnBlock(state: GameState, letter: string): GameState {
  const color = LETTER_COLORS[letter] || LETTER_COLORS.DEFAULT

  const newBlock: Block = {
    id: ++blockIdCounter,
    x: SPAWN_POSITION.x,
    y: SPAWN_POSITION.y,
    letter: letter.toUpperCase(),
    locked: false,
    color,
  }

  // Generate next letter based on current grid
  const nextLetter = generateLetter([...state.blocks, newBlock])

  return {
    ...state,
    blocks: [...state.blocks, newBlock],
    nextLetter,
  }
}

/**
 * Check if the game is over (spawn position blocked)
 */
export function isGameOver(state: GameState): boolean {
  return state.blocks.some(
    b => b.x === SPAWN_POSITION.x && b.y === SPAWN_POSITION.y && b.locked
  )
}

/**
 * Get the currently active (unlocked) block
 */
export function getActiveBlock(state: GameState): Block | undefined {
  return state.blocks.find(b => !b.locked)
}

/**
 * Move the game forward by one tick (gravity)
 */
export function tick(state: GameState): GameState {
  const activeBlock = getActiveBlock(state)

  if (!activeBlock) {
    return state
  }

  const newY = activeBlock.y + 1

  // Check if block should lock (at bottom or on top of another block)
  const shouldLock =
    newY >= GRID_HEIGHT ||
    state.blocks.some(
      b => b.locked && b.x === activeBlock.x && b.y === newY
    )

  if (shouldLock) {
    // Lock the block at current position
    return {
      ...state,
      blocks: state.blocks.map(b =>
        b === activeBlock ? { ...b, locked: true } : b
      ),
    }
  }

  // Move block down
  return {
    ...state,
    blocks: state.blocks.map(b =>
      b === activeBlock ? { ...b, y: newY } : b
    ),
  }
}

/**
 * Lock the active block immediately
 */
export function lockActiveBlock(state: GameState): GameState {
  const activeBlock = getActiveBlock(state)

  if (!activeBlock) {
    return state
  }

  return {
    ...state,
    blocks: state.blocks.map(b =>
      b === activeBlock ? { ...b, locked: true } : b
    ),
  }
}
