import { useState, useCallback } from 'react'
import { GameMode } from '../lib/types'

interface Score {
  id: string
  name: string
  score: number
  words: number
  mode: GameMode
  timestamp: number
}

interface ScoreSubmission {
  name: string
  score: number
  words: number
  mode: GameMode
}

const API_BASE = '/api/scores'

export function useScores() {
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchScores = useCallback(async (mode: GameMode, limit = 10) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}?mode=${mode}&limit=${limit}`)
      if (!response.ok) {
        throw new Error('Failed to fetch scores')
      }
      const data = await response.json()
      setScores(data.scores || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setScores([])
    } finally {
      setLoading(false)
    }
  }, [])

  const submitScore = useCallback(async (submission: ScoreSubmission) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      })

      if (!response.ok) {
        throw new Error('Failed to submit score')
      }

      const data = await response.json()
      return {
        success: true,
        rank: data.rank,
        score: data.score,
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return { success: false, rank: null, score: null }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    scores,
    loading,
    error,
    fetchScores,
    submitScore,
  }
}
