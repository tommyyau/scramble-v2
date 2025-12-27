// Core game types

export interface Block {
  id: number
  x: number
  y: number
  letter: string
  locked: boolean
  color: string
  isAnimating?: boolean
  isDisappearing?: boolean
  isCelebrating?: boolean  // Block is part of a found word, glowing before removal
}

export interface FoundWord {
  word: string
  blocks: Block[]
  direction: 'horizontal' | 'vertical'
}

export interface WordMatch {
  word: string
  blocks: { x: number; y: number }[]
  score: number
}

export interface GameState {
  blocks: Block[]
  nextLetter: string | null
  score: number
  level: number
  linesCleared: number
  wordsFound: string[]
  bonusWordsFound: string[]
  bonusWordsTarget: string[]
  chainMultiplier: number
  gameOver: boolean
  isPaused: boolean
  mode: GameMode
  currentBonusWord: string | null
}

export interface ClearedPosition {
  x: number
  y: number
  color: string
}

export interface ChainResult extends GameState {
  chainCount: number
  chainMultipliers: number[]
  clearedPositions: ClearedPosition[]
  bonusWordMatched: boolean
}

export type GameMode = 'classic' | 'zen' | 'sprint' | 'daily'


export interface GameSettings {
  speed: number
  levelInterval: number
  soundEnabled: boolean
  hapticsEnabled: boolean
  hintsEnabled: boolean
}

export interface LeaderboardEntry {
  id: string
  name: string
  score: number
  level: number
  words: string[]
  date: number
  mode: GameMode
}

export interface PlayerStats {
  totalWords: number
  uniqueWords: string[]
  totalScore: number
  gamesPlayed: number
  bestScore: number
  bestChain: number
  averageScore: number
}

// Constants
export const GRID_SIZE = 8
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const VOWELS = ['A', 'E', 'I', 'O', 'U']
