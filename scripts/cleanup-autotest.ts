/**
 * Cleanup script to remove all auto-test entries from Vercel KV
 * Run with: npx tsx scripts/cleanup-autotest.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { kv } from '@vercel/kv'

interface StoredScore {
  id: string
  name: string
  score: number
  mode: string
}

async function cleanup() {
  console.log('🧹 Cleaning up auto-test entries...\n')

  const keys = ['scores:all', 'scores:classic', 'scores:zen', 'scores:sprint', 'scores:daily']

  for (const key of keys) {
    console.log(`Processing ${key}...`)

    // Get all scores
    const rawScores = await kv.zrange(key, 0, -1, { rev: true })

    let removed = 0
    for (const item of rawScores) {
      const score = typeof item === 'string' ? JSON.parse(item) : item as StoredScore

      if (score.name === 'auto-test') {
        // Remove this entry
        await kv.zrem(key, typeof item === 'string' ? item : JSON.stringify(item))
        removed++
      }
    }

    console.log(`  Removed ${removed} auto-test entries from ${key}`)
  }

  console.log('\n✅ Cleanup complete!')
}

cleanup().catch(console.error)
