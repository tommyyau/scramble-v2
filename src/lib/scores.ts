// Local storage based score management

import { GameMode } from './types'

export interface WordWithScore {
  word: string
  score: number
}

export interface ScoreEntry {
  id: string
  name: string
  score: number
  level: number
  wordsFound: number
  longestWord: string
  bestChain: number
  date: string // ISO string
  mode: GameMode
  wordHistory?: WordWithScore[] // All words found with their scores
}

const SCORES_KEY = 'scramble-scores'

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// Get all scores from localStorage
export function getAllScores(): ScoreEntry[] {
  try {
    const stored = localStorage.getItem(SCORES_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

// Save scores to localStorage
function saveScores(scores: ScoreEntry[]): void {
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores))
  } catch {
    // localStorage not available
  }
}

// Submit a new score
export function submitScore(entry: Omit<ScoreEntry, 'id' | 'date'>): ScoreEntry {
  const scores = getAllScores()

  const newEntry: ScoreEntry = {
    ...entry,
    id: generateId(),
    date: new Date().toISOString(),
  }

  scores.push(newEntry)

  // Keep only top 100 scores to avoid localStorage bloat
  scores.sort((a, b) => b.score - a.score)
  const trimmed = scores.slice(0, 100)

  saveScores(trimmed)
  return newEntry
}

// Get top scores (all time)
export function getTopScores(limit = 10, mode?: GameMode): ScoreEntry[] {
  let scores = getAllScores()

  if (mode) {
    scores = scores.filter(s => s.mode === mode)
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// Get today's scores
export function getTodayScores(limit = 10, mode?: GameMode): ScoreEntry[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()

  let scores = getAllScores().filter(s => {
    const scoreDate = new Date(s.date).getTime()
    return scoreDate >= todayStart
  })

  if (mode) {
    scores = scores.filter(s => s.mode === mode)
  }

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// Get personal best
export function getPersonalBest(mode?: GameMode): ScoreEntry | null {
  const scores = getTopScores(1, mode)
  return scores[0] || null
}

// Clear all scores (for testing)
export function clearAllScores(): void {
  try {
    localStorage.removeItem(SCORES_KEY)
  } catch {
    // localStorage not available
  }
}
