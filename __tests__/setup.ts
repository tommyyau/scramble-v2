import { Block, GameState } from '../src/lib/types'
import { LETTER_COLORS, GRID_WIDTH, GRID_HEIGHT } from '../src/lib/constants'

// Test block ID counter
let testBlockId = 0

export function resetTestBlockId() {
  testBlockId = 0
}

/**
 * Helper to create a block quickly
 */
export function block(x: number, y: number, letter: string, locked = true): Block {
  return {
    id: ++testBlockId,
    x,
    y,
    letter: letter.toUpperCase(),
    locked,
    color: LETTER_COLORS[letter.toUpperCase()] || LETTER_COLORS.DEFAULT,
  }
}

/**
 * Helper to create a row of blocks at a given y position
 */
export function row(y: number, letters: string, startX = 0): Block[] {
  return letters.split('').map((letter, i) => {
    if (letter === ' ' || letter === '_') return null
    return block(startX + i, y, letter)
  }).filter((b): b is Block => b !== null)
}

/**
 * Create an empty initial game state
 */
export function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    blocks: [],
    nextLetter: null,
    score: 0,
    level: 1,
    linesCleared: 0,
    wordsFound: [],
    bonusWordsFound: [],
    bonusWordsTarget: [],
    currentBonusWord: null,
    chainMultiplier: 1,
    gameOver: false,
    isPaused: false,
    mode: 'classic',
    ...overrides,
  }
}

/**
 * Helper to get block at specific position
 */
export function getBlockAt(blocks: Block[], x: number, y: number): Block | undefined {
  return blocks.find(b => b.x === x && b.y === y)
}

/**
 * Helper to check if position is occupied
 */
export function isOccupied(blocks: Block[], x: number, y: number): boolean {
  return blocks.some(b => b.x === x && b.y === y)
}

/**
 * Create a grid representation for debugging
 */
export function gridToString(blocks: Block[]): string {
  const grid: string[][] = Array(GRID_HEIGHT).fill(null).map(() =>
    Array(GRID_WIDTH).fill('.')
  )

  blocks.forEach(b => {
    if (b.x >= 0 && b.x < GRID_WIDTH && b.y >= 0 && b.y < GRID_HEIGHT) {
      grid[b.y][b.x] = b.letter
    }
  })

  return grid.map(row => row.join(' ')).join('\n')
}
