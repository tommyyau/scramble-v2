import { kv } from '@vercel/kv'

interface StoredScore {
  id: string
  name: string
  score: number
  level: number
  wordsFound: number
  longestWord: string
  bestChain: number
  mode: 'classic' | 'zen' | 'sprint' | 'daily'
  date: string
  wordHistory?: { word: string; score: number }[]
}

export default async function handler(req: Request): Promise<Response> {
  // Only allow GET
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get('mode') // 'classic', 'zen', 'sprint', 'daily', or null for all
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100)
    const timeframe = url.searchParams.get('timeframe') || 'all' // 'all', 'today', 'week'

    // Determine which key to query
    const key = mode ? `scores:${mode}` : 'scores:all'

    // Get top scores (sorted set returns highest scores first with ZREVRANGE)
    const rawScores = await kv.zrange(key, 0, limit - 1, { rev: true })

    // Parse and filter by timeframe
    // @vercel/kv may return already-parsed objects or strings
    let scores: StoredScore[] = rawScores.map((item: unknown) => {
      if (typeof item === 'string') {
        return JSON.parse(item)
      }
      return item as StoredScore
    })

    // Apply timeframe filter
    if (timeframe !== 'all') {
      const now = new Date()
      let cutoff: Date

      if (timeframe === 'today') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (timeframe === 'week') {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else {
        cutoff = new Date(0) // All time
      }

      scores = scores.filter(s => new Date(s.date) >= cutoff)
    }

    // Return scores (without wordHistory to reduce payload size)
    const leaderboard = scores.slice(0, limit).map(s => ({
      id: s.id,
      name: s.name,
      score: s.score,
      level: s.level,
      wordsFound: s.wordsFound,
      longestWord: s.longestWord,
      bestChain: s.bestChain,
      mode: s.mode,
      date: s.date,
    }))

    return new Response(JSON.stringify({ scores: leaderboard }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = {
  runtime: 'edge',
}
