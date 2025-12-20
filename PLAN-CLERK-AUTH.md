# Clerk Authentication Implementation Plan

## Overview

Add Clerk authentication to Scramble to enable:
- User sign-up and login
- Personal high scores tied to authenticated users
- Streak tracking across sessions
- Display user name from Clerk profile

## Current State

- **Framework**: Vite + React (client-only)
- **State**: Zustand store for game, localStorage for scores
- **Backend**: None (need to add Vercel serverless functions)
- **Existing**: `@vercel/kv` already in package.json

---

## Phase 1: Clerk Setup (Frontend)

### 1.1 Install Clerk React SDK

```bash
npm install @clerk/clerk-react
```

### 1.2 Environment Variables

Create `.env.local` (gitignored):
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 1.3 Wrap App with ClerkProvider

**File: `src/main.tsx`**

```tsx
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
```

### 1.4 Create Auth Components

**File: `src/components/auth/AuthButton.tsx`**

A header button that shows:
- "Sign In" when logged out → opens Clerk modal
- User avatar + name when logged in → dropdown with sign out

```tsx
import { SignInButton, SignOutButton, useUser } from '@clerk/clerk-react'

export function AuthButton() {
  const { isSignedIn, user } = useUser()

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <img src={user.imageUrl} className="w-8 h-8 rounded-full" />
        <span>{user.firstName || user.username}</span>
        <SignOutButton />
      </div>
    )
  }

  return <SignInButton mode="modal" />
}
```

### 1.5 Add Auth UI to App Header

**File: `src/App.tsx`**

Add `<AuthButton />` to the header section alongside the existing navigation buttons.

---

## Phase 2: Vercel Serverless API Routes

Since this is a Vite app (not Next.js), we need to add Vercel serverless functions.

### 2.1 Create API Directory Structure

```
api/
├── scores/
│   ├── index.ts      # GET all scores, POST new score
│   └── [userId].ts   # GET scores for specific user
├── user/
│   └── stats.ts      # GET/PUT user stats (streaks, etc.)
└── _lib/
    ├── kv.ts         # Vercel KV helpers
    └── auth.ts       # Clerk auth verification
```

### 2.2 Vercel KV Data Schema

**Keys structure:**
```
scores:global              → Sorted set of all scores (by score value)
scores:user:{userId}       → Sorted set of user's scores
scores:daily:{date}        → Sorted set of today's scores
scores:mode:{mode}         → Sorted set by game mode

user:{userId}:stats        → Hash with user stats
  - highScore
  - totalGames
  - currentStreak
  - bestStreak
  - totalWordsFound
  - lastPlayedAt

score:{scoreId}            → Hash with full score details
  - userId
  - name
  - score
  - level
  - wordsFound
  - longestWord
  - bestChain
  - mode
  - date
  - wordHistory (JSON string)
```

### 2.3 API: Submit Score

**File: `api/scores/index.ts`**

```ts
import { kv } from '@vercel/kv'
import { verifyClerkToken } from '../_lib/auth'

export async function POST(request: Request) {
  // Verify Clerk JWT from Authorization header
  const userId = await verifyClerkToken(request)

  const body = await request.json()
  const scoreId = crypto.randomUUID()
  const date = new Date().toISOString()

  // Store score details
  await kv.hset(`score:${scoreId}`, {
    ...body,
    userId,
    date,
  })

  // Add to sorted sets for leaderboards
  await kv.zadd('scores:global', { score: body.score, member: scoreId })
  await kv.zadd(`scores:user:${userId}`, { score: body.score, member: scoreId })
  await kv.zadd(`scores:mode:${body.mode}`, { score: body.score, member: scoreId })

  // Update user stats
  await updateUserStats(userId, body)

  return Response.json({ success: true, scoreId })
}

export async function GET(request: Request) {
  // Get top scores (public, no auth required)
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode')
  const limit = parseInt(url.searchParams.get('limit') || '20')

  const key = mode ? `scores:mode:${mode}` : 'scores:global'
  const scoreIds = await kv.zrange(key, 0, limit - 1, { rev: true })

  const scores = await Promise.all(
    scoreIds.map(id => kv.hgetall(`score:${id}`))
  )

  return Response.json(scores)
}
```

### 2.4 API: User Stats

**File: `api/user/stats.ts`**

```ts
import { kv } from '@vercel/kv'
import { verifyClerkToken } from '../_lib/auth'

export async function GET(request: Request) {
  const userId = await verifyClerkToken(request)
  const stats = await kv.hgetall(`user:${userId}:stats`)
  return Response.json(stats || defaultStats)
}

// Calculate streaks based on consecutive daily play
async function updateUserStats(userId: string, scoreData: any) {
  const stats = await kv.hgetall(`user:${userId}:stats`) || defaultStats
  const today = new Date().toDateString()
  const lastPlayed = stats.lastPlayedAt ? new Date(stats.lastPlayedAt).toDateString() : null

  let newStreak = stats.currentStreak || 0

  if (lastPlayed === today) {
    // Already played today, no streak change
  } else if (lastPlayed === getYesterday()) {
    // Consecutive day, increment streak
    newStreak++
  } else {
    // Streak broken, reset to 1
    newStreak = 1
  }

  await kv.hset(`user:${userId}:stats`, {
    highScore: Math.max(stats.highScore || 0, scoreData.score),
    totalGames: (stats.totalGames || 0) + 1,
    currentStreak: newStreak,
    bestStreak: Math.max(stats.bestStreak || 0, newStreak),
    totalWordsFound: (stats.totalWordsFound || 0) + scoreData.wordsFound,
    lastPlayedAt: new Date().toISOString(),
  })
}
```

### 2.5 Clerk Token Verification

**File: `api/_lib/auth.ts`**

```ts
import { verifyToken } from '@clerk/backend'

export async function verifyClerkToken(request: Request): Promise<string> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization')
  }

  const token = authHeader.substring(7)
  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  })

  return payload.sub // userId
}
```

---

## Phase 3: Frontend API Integration

### 3.1 Create API Client with Auth

**File: `src/lib/api.ts`**

```ts
import { useAuth } from '@clerk/clerk-react'

export function useApi() {
  const { getToken } = useAuth()

  async function authFetch(url: string, options: RequestInit = {}) {
    const token = await getToken()
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })
  }

  return {
    submitScore: async (score: ScoreData) => {
      const res = await authFetch('/api/scores', {
        method: 'POST',
        body: JSON.stringify(score),
      })
      return res.json()
    },

    getScores: async (mode?: string) => {
      const url = mode ? `/api/scores?mode=${mode}` : '/api/scores'
      const res = await fetch(url) // Public, no auth needed
      return res.json()
    },

    getUserStats: async () => {
      const res = await authFetch('/api/user/stats')
      return res.json()
    },
  }
}
```

### 3.2 Update Score Submission Flow

**File: `src/components/game/Game.tsx`**

Modify the game over screen:
- If signed in: Auto-submit score with Clerk user name
- If signed out: Show "Sign in to save your score" prompt

```tsx
import { useUser } from '@clerk/clerk-react'
import { useApi } from '@/lib/api'

function GameOverScreen() {
  const { isSignedIn, user } = useUser()
  const api = useApi()

  const submitScore = async () => {
    if (!isSignedIn) return

    await api.submitScore({
      name: user.firstName || user.username || 'Anonymous',
      score: gameState.score,
      level: gameState.level,
      wordsFound: gameState.totalWordsFound,
      longestWord: gameState.longestWord,
      bestChain: gameState.bestChain,
      mode: gameState.mode,
      wordHistory: gameState.wordHistory,
    })
  }

  return (
    <div>
      {isSignedIn ? (
        <button onClick={submitScore}>Save Score</button>
      ) : (
        <SignInButton mode="modal">
          <button>Sign in to save your score</button>
        </SignInButton>
      )}
    </div>
  )
}
```

### 3.3 Update Leaderboard Component

**File: `src/components/ui/Leaderboard.tsx`**

- Fetch scores from API instead of localStorage
- Add "My Scores" tab for signed-in users
- Highlight current user's scores in global leaderboard

---

## Phase 4: User Profile & Stats Display

### 4.1 Create User Stats Hook

**File: `src/hooks/useUserStats.ts`**

```ts
import { useUser } from '@clerk/clerk-react'
import { useApi } from '@/lib/api'
import { useEffect, useState } from 'react'

export function useUserStats() {
  const { isSignedIn } = useUser()
  const api = useApi()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (isSignedIn) {
      api.getUserStats().then(setStats)
    }
  }, [isSignedIn])

  return stats
}
```

### 4.2 Add Stats Display to Home Screen

Show when signed in:
- Current streak (🔥 5 day streak!)
- Personal best score
- Total words found
- Games played

---

## Phase 5: Polish & Edge Cases

### 5.1 Guest Play Support

Allow playing without signing in:
- Scores saved locally only
- Prompt to sign in after game over to save to cloud
- Option to claim local scores after signing in

### 5.2 Loading States

- Show skeleton loaders while fetching scores
- Optimistic UI for score submission
- Error handling with retry

### 5.3 Offline Support

- Queue score submissions when offline
- Sync when back online
- localStorage fallback for unreliable connections

---

## File Changes Summary

### New Files
```
src/components/auth/AuthButton.tsx
src/lib/api.ts
src/hooks/useUserStats.ts
api/scores/index.ts
api/user/stats.ts
api/_lib/auth.ts
api/_lib/kv.ts
.env.local (gitignored)
```

### Modified Files
```
src/main.tsx              - Add ClerkProvider
src/App.tsx               - Add AuthButton to header
src/components/game/Game.tsx - Update score submission
src/components/ui/Leaderboard.tsx - Fetch from API
package.json              - Add @clerk/clerk-react, @clerk/backend
```

---

## Environment Variables Required

```env
# Clerk (get from dashboard.clerk.com)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Vercel KV (auto-populated when linked)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

---

## Implementation Order

1. **Phase 1** - Get Clerk working (sign in/out buttons)
2. **Phase 2** - Create API routes with KV storage
3. **Phase 3** - Connect frontend to APIs
4. **Phase 4** - Add user stats display
5. **Phase 5** - Polish and edge cases

Each phase can be tested independently before moving to the next.
