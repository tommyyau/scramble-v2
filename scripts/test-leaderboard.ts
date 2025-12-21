/**
 * Test script for Vercel KV leaderboard functionality
 * Run with: npx tsx scripts/test-leaderboard.ts
 *
 * Submits test scores with username "auto-test" so they're easily identifiable
 */

import { config } from 'dotenv'
// Load .env.local
config({ path: '.env.local' })

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
  mode: 'classic' | 'zen' | 'sprint' | 'daily'
  wordHistory: WordWithScore[]
}

interface StoredScore extends ScoreSubmission {
  id: string
  date: string
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

// Test data - realistic game scenarios
const testScores: ScoreSubmission[] = [
  {
    name: 'auto-test',
    score: 245,
    level: 3,
    wordsFound: 8,
    longestWord: 'TRAIN',
    bestChain: 2,
    mode: 'classic',
    wordHistory: [
      { word: 'CAT', score: 15 },
      { word: 'DOG', score: 15 },
      { word: 'THE', score: 12 },
      { word: 'AND', score: 12 },
      { word: 'TRAIN', score: 45 },
      { word: 'SET', score: 15 },
      { word: 'RUN', score: 18 },
      { word: 'MAP', score: 21 },
    ],
  },
  {
    name: 'auto-test',
    score: 512,
    level: 5,
    wordsFound: 15,
    longestWord: 'SPRINT',
    bestChain: 3,
    mode: 'sprint',
    wordHistory: [
      { word: 'RUN', score: 18 },
      { word: 'FAST', score: 28 },
      { word: 'SPRINT', score: 72 },
      { word: 'WIN', score: 21 },
      { word: 'TOP', score: 18 },
    ],
  },
  {
    name: 'auto-test',
    score: 178,
    level: 2,
    wordsFound: 6,
    longestWord: 'CALM',
    bestChain: 1,
    mode: 'zen',
    wordHistory: [
      { word: 'ZEN', score: 36 },
      { word: 'CALM', score: 32 },
      { word: 'PEACE', score: 40 },
    ],
  },
  {
    name: 'auto-test',
    score: 890,
    level: 7,
    wordsFound: 22,
    longestWord: 'QUARTZ',
    bestChain: 4,
    mode: 'daily',
    wordHistory: [
      { word: 'QUARTZ', score: 180 },
      { word: 'JAM', score: 45 },
      { word: 'EXTRA', score: 60 },
    ],
  },
]

async function submitScore(submission: ScoreSubmission): Promise<StoredScore> {
  const storedScore: StoredScore = {
    ...submission,
    id: generateId(),
    date: new Date().toISOString(),
  }

  // Store in sorted set by score
  const key = `scores:${submission.mode}`

  await kv.zadd(key, {
    score: submission.score,
    member: JSON.stringify(storedScore),
  })

  // Also store in global scores
  await kv.zadd('scores:all', {
    score: submission.score,
    member: JSON.stringify(storedScore),
  })

  return storedScore
}

async function getLeaderboard(mode?: string, limit = 10): Promise<StoredScore[]> {
  const key = mode ? `scores:${mode}` : 'scores:all'
  const rawScores = await kv.zrange(key, 0, limit - 1, { rev: true })
  // @vercel/kv may return already-parsed objects or strings
  return rawScores.map((item: unknown) => {
    if (typeof item === 'string') {
      return JSON.parse(item)
    }
    return item as StoredScore
  })
}

async function runTests() {
  console.log('🧪 Starting Vercel KV Leaderboard Tests\n')
  console.log('=' .repeat(50))

  // Test 1: Submit test scores
  console.log('\n📤 Test 1: Submitting test scores...\n')

  for (const testScore of testScores) {
    try {
      const result = await submitScore(testScore)
      console.log(`  ✅ Submitted: ${result.name} - ${result.mode} - ${result.score} pts (ID: ${result.id})`)
    } catch (error) {
      console.log(`  ❌ Failed to submit ${testScore.mode} score:`, error)
    }
  }

  // Test 2: Fetch global leaderboard
  console.log('\n📊 Test 2: Fetching global leaderboard...\n')

  try {
    const globalScores = await getLeaderboard(undefined, 20)
    console.log(`  Found ${globalScores.length} scores in global leaderboard:`)
    globalScores.slice(0, 10).forEach((score, idx) => {
      console.log(`    ${idx + 1}. ${score.name} - ${score.score} pts (${score.mode})`)
    })
  } catch (error) {
    console.log('  ❌ Failed to fetch global leaderboard:', error)
  }

  // Test 3: Fetch per-mode leaderboards
  console.log('\n🎮 Test 3: Fetching per-mode leaderboards...\n')

  for (const mode of ['classic', 'zen', 'sprint', 'daily']) {
    try {
      const scores = await getLeaderboard(mode, 5)
      console.log(`  ${mode.toUpperCase()}: ${scores.length} scores`)
      if (scores.length > 0) {
        console.log(`    Top: ${scores[0].name} - ${scores[0].score} pts`)
      }
    } catch (error) {
      console.log(`  ❌ Failed to fetch ${mode} leaderboard:`, error)
    }
  }

  // Test 4: Verify auto-test scores exist
  console.log('\n🔍 Test 4: Verifying auto-test scores...\n')

  try {
    const allScores = await getLeaderboard(undefined, 100)
    const autoTestScores = allScores.filter(s => s.name === 'auto-test')
    console.log(`  Found ${autoTestScores.length} auto-test scores:`)
    autoTestScores.forEach(score => {
      console.log(`    - ${score.mode}: ${score.score} pts, ${score.wordsFound} words, best chain ${score.bestChain}x`)
    })
  } catch (error) {
    console.log('  ❌ Failed to verify auto-test scores:', error)
  }

  console.log('\n' + '=' .repeat(50))
  console.log('✨ Tests complete!\n')
  console.log('Check the leaderboard in the app to see "auto-test" scores.')
}

// Run tests
runTests().catch(console.error)
