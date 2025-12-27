import { kv } from '@vercel/kv'

interface WordWithScore {
  word: string
  score: number
}

interface ScoreSubmission {
  name: string
  score: number
  level: number
  wordsFound: number
  longestWord: string
  bestChain: number
  bestStreak: number
  mode: 'classic' | 'zen' | 'sprint' | 'daily'
  wordHistory?: WordWithScore[]
}

interface StoredScore extends ScoreSubmission {
  id: string
  date: string
}

// Validate score plausibility
function isScorePlausible(submission: ScoreSubmission): boolean {
  // Basic validation
  if (submission.score < 0 || submission.score > 1000000) return false
  if (submission.level < 1 || submission.level > 100) return false
  if (submission.wordsFound < 0 || submission.wordsFound > 1000) return false
  if (submission.bestChain < 0 || submission.bestChain > 50) return false
  if (submission.bestStreak < 0 || submission.bestStreak > 1000) return false

  // Score should be roughly proportional to words found
  // Average word is ~15-30 points, allow generous range
  if (submission.wordsFound > 0) {
    const avgPointsPerWord = submission.score / submission.wordsFound
    if (avgPointsPerWord > 500) return false // Suspiciously high
  }

  // Name validation
  if (!submission.name || submission.name.length > 20) return false

  return true
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

export default async function handler(req: Request): Promise<Response> {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const submission: ScoreSubmission = await req.json()

    // Validate
    if (!isScorePlausible(submission)) {
      return new Response(JSON.stringify({ error: 'Invalid score submission' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create stored score
    const storedScore: StoredScore = {
      ...submission,
      id: generateId(),
      date: new Date().toISOString(),
    }

    // Store in sorted set by score (for leaderboard)
    // Key format: scores:{mode}
    const key = `scores:${submission.mode}`

    // Add to sorted set with score as the sort value
    await kv.zadd(key, {
      score: submission.score,
      member: JSON.stringify(storedScore),
    })

    // Also store in global scores
    await kv.zadd('scores:all', {
      score: submission.score,
      member: JSON.stringify(storedScore),
    })

    // Trim to keep only top 1000 scores per mode
    await kv.zremrangebyrank(key, 0, -1001)
    await kv.zremrangebyrank('scores:all', 0, -1001)

    return new Response(JSON.stringify({ success: true, id: storedScore.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error submitting score:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = {
  runtime: 'edge',
}
