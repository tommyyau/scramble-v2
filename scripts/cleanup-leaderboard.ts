/**
 * Cleanup script to remove all scores from Vercel KV.
 * Run before re-migrating legacy scores.
 *
 * Run with: npx tsx scripts/cleanup-leaderboard.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import { kv } from '@vercel/kv'

const SCORE_KEYS = [
  'scores:classic',
  'scores:zen',
  'scores:sprint',
  'scores:daily',
  'scores:all',
]

async function cleanup() {
  console.log('Cleaning up Vercel KV leaderboard data...\n')

  for (const key of SCORE_KEYS) {
    const count = await kv.zcard(key)
    if (count > 0) {
      await kv.del(key)
      console.log(`Deleted ${key} (${count} entries)`)
    } else {
      console.log(`${key} was already empty`)
    }
  }

  console.log('\nCleanup complete! All score data has been removed.')
  console.log('Run "npx tsx scripts/migrate-legacy-scores.ts" to restore legacy scores.')
}

cleanup().catch(console.error)
