/**
 * Tests for the leaderboard API endpoint
 * Ensures wordHistory is included in responses for the expandable word list feature
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @vercel/kv
vi.mock('@vercel/kv', () => ({
  kv: {
    zrange: vi.fn(),
  },
}))

import { kv } from '@vercel/kv'

// Import the handler after mocking
import handler from '../../api/scores/leaderboard'

describe('Leaderboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should include wordHistory in response for expandable word list', async () => {
    const mockScores = [
      {
        id: 'test1',
        name: 'Player1',
        score: 500,
        level: 5,
        wordsFound: 10,
        longestWord: 'TRAIN',
        bestChain: 3,
        mode: 'classic',
        date: new Date().toISOString(),
        wordHistory: [
          { word: 'CAT', score: 15 },
          { word: 'TRAIN', score: 45 },
          { word: 'DOG', score: 15 },
        ],
      },
    ]

    vi.mocked(kv.zrange).mockResolvedValue(mockScores)

    const request = new Request('http://localhost/api/scores/leaderboard')
    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.scores).toHaveLength(1)
    expect(data.scores[0]).toHaveProperty('wordHistory')
    expect(data.scores[0].wordHistory).toEqual([
      { word: 'CAT', score: 15 },
      { word: 'TRAIN', score: 45 },
      { word: 'DOG', score: 15 },
    ])
  })

  it('should handle scores without wordHistory gracefully', async () => {
    const mockScores = [
      {
        id: 'test2',
        name: 'Player2',
        score: 200,
        level: 2,
        wordsFound: 5,
        longestWord: 'CAT',
        bestChain: 1,
        mode: 'zen',
        date: new Date().toISOString(),
        // No wordHistory
      },
    ]

    vi.mocked(kv.zrange).mockResolvedValue(mockScores)

    const request = new Request('http://localhost/api/scores/leaderboard')
    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.scores).toHaveLength(1)
    // wordHistory will be undefined (JSON drops undefined properties)
    expect(data.scores[0].wordHistory).toBeUndefined()
  })

  it('should filter scores by timeframe=today', async () => {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    const mockScores = [
      {
        id: 'today-score',
        name: 'TodayPlayer',
        score: 300,
        level: 3,
        wordsFound: 8,
        longestWord: 'RUN',
        bestChain: 2,
        mode: 'sprint',
        date: today.toISOString(),
        wordHistory: [{ word: 'RUN', score: 18 }],
      },
      {
        id: 'old-score',
        name: 'OldPlayer',
        score: 500,
        level: 5,
        wordsFound: 15,
        longestWord: 'FAST',
        bestChain: 3,
        mode: 'sprint',
        date: yesterday.toISOString(),
        wordHistory: [{ word: 'FAST', score: 28 }],
      },
    ]

    vi.mocked(kv.zrange).mockResolvedValue(mockScores)

    const request = new Request('http://localhost/api/scores/leaderboard?timeframe=today')
    const response = await handler(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.scores).toHaveLength(1)
    expect(data.scores[0].name).toBe('TodayPlayer')
  })

  it('should filter scores by mode', async () => {
    vi.mocked(kv.zrange).mockResolvedValue([])

    const request = new Request('http://localhost/api/scores/leaderboard?mode=classic')
    await handler(request)

    // Verify kv.zrange was called with the correct key
    expect(kv.zrange).toHaveBeenCalledWith('scores:classic', 0, 99, { rev: true })
  })

  it('should return 405 for non-GET requests', async () => {
    const request = new Request('http://localhost/api/scores/leaderboard', {
      method: 'POST',
    })
    const response = await handler(request)

    expect(response.status).toBe(405)
  })
})
