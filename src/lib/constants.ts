// Game constants and configuration

export const GRID_SIZE = 8
export const GRID_WIDTH = 8
export const GRID_HEIGHT = 8
export const MIN_WORD_LENGTH = 3

// Spawn position (center top)
export const SPAWN_POSITION = { x: 4, y: 0 }

// Timing
export const INITIAL_DROP_SPEED = 600 // ms
export const FAST_DROP_SPEED = 20 // ms
export const LEVEL_SPEED_MULTIPLIER = 0.90 // 10% faster each level
export const MIN_DROP_SPEED = 100 // ms

// Level thresholds - score needed to reach each level
export const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  850,    // Level 5
  1300,   // Level 6
  1900,   // Level 7
  2600,   // Level 8
  3500,   // Level 9
  4500,   // Level 10
]

// Calculate level from score
export function getLevelFromScore(score: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= LEVEL_THRESHOLDS[i]) {
      return i + 1
    }
  }
  return 1
}

// Get drop speed for a level
export function getDropSpeedForLevel(baseSpeed: number, level: number): number {
  const speed = baseSpeed * Math.pow(LEVEL_SPEED_MULTIPLIER, level - 1)
  return Math.max(speed, MIN_DROP_SPEED)
}

// Scrabble letter weights (frequency)
export const SCRABBLE_WEIGHTS: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9,
  J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6,
  S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
}

// Scrabble letter points
export const LETTER_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1,
  J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1,
  S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
}

// Block colors based on letter type
export const LETTER_COLORS: Record<string, string> = {
  // Vowels - warm colors
  A: 'bg-block-a',
  E: 'bg-block-e',
  I: 'bg-block-i',
  O: 'bg-block-o',
  U: 'bg-block-u',
  // Common consonants - teal
  R: 'bg-block-common',
  S: 'bg-block-common',
  T: 'bg-block-common',
  L: 'bg-block-common',
  N: 'bg-block-common',
  // Rare letters - purple
  Q: 'bg-block-rare',
  X: 'bg-block-rare',
  Z: 'bg-block-rare',
  J: 'bg-block-rare',
  K: 'bg-block-rare',
  // Default for unlisted letters
  DEFAULT: 'bg-block-medium',
}

// Default to medium blue for other consonants
export const DEFAULT_BLOCK_COLOR = 'bg-block-medium'

// Get color for a letter
export function getColorForLetter(letter: string): string {
  return LETTER_COLORS[letter.toUpperCase()] || DEFAULT_BLOCK_COLOR
}

// Game mode configurations
export const MODE_CONFIGS = {
  classic: {
    dropSpeed: INITIAL_DROP_SPEED,
    speedIncreases: true,
    hasTimer: false,
    hasBonusWords: true,
  },
  zen: {
    dropSpeed: INITIAL_DROP_SPEED, // Same speed as classic, but never increases
    speedIncreases: false,
    hasTimer: false,
    hasBonusWords: true,
  },
  sprint: {
    dropSpeed: INITIAL_DROP_SPEED * 0.7, // Faster
    speedIncreases: true,
    hasTimer: true,
    timerDuration: 120000, // 2 minutes
    hasBonusWords: true,
  },
  daily: {
    dropSpeed: INITIAL_DROP_SPEED,
    speedIncreases: true,
    hasTimer: false,
    hasBonusWords: true,
    usesSeed: true,
  },
}

// Default settings
export const DEFAULT_SETTINGS = {
  speed: 0.20,
  levelInterval: 60000,
  soundEnabled: false,
  hapticsEnabled: true,
  hintsEnabled: false,
}
