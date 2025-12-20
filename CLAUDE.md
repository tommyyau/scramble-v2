# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server
npm run build        # TypeScript check + production build
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npx vitest run __tests__/engine/words.test.ts  # Run single test file
```

## Architecture

Scramble is a Tetris-style word puzzle game where letter blocks fall and players form words horizontally or vertically.

### Core Layers

**Game Engine** (`src/lib/engine/`) - Pure functions, no React dependencies, fully tested:
- `core.ts` - Game state initialization, block spawning, tick logic
- `grid.ts` - Block movement (moveBlock, hardDrop, applyGravity)
- `words.ts` - Word detection in grid (horizontal/vertical scanning)
- `chains.ts` - Chain reaction processing (words clearing → gravity → new words)
- `scoring.ts` - Score calculation with length/chain/rarity bonuses
- `smart-letters.ts` - Weighted letter generation that prevents impossible situations

**State Management** (`src/stores/game.ts`) - Zustand store that wraps engine functions and adds:
- UI state (celebrations, particles, shake effects)
- Sound effect triggers
- Streak tracking
- Word history with individual scores

**React Components** (`src/components/`):
- `game/` - Core game UI (Board, Block, Controls, Game orchestrator)
- `effects/` - Visual feedback (Particles, ChainIndicator, LevelUpIndicator)
- `ui/` - Supporting screens (WordBank, Leaderboard)

### Game Flow

1. `startGame(mode)` → creates initial state, spawns first block
2. `gameTick()` runs on interval → moves active block down
3. Block locks when it hits bottom/another block
4. `processChainReaction()` → finds words → clears them → applies gravity → repeats until no new words
5. `spawnBlock()` generates next letter using smart-letters algorithm

### Key Types (`src/lib/types.ts`)

- `Block` - Single letter tile with position, locked state, color
- `GameState` - Core game state passed through engine functions
- `GameMode` - 'classic' | 'zen' | 'sprint' | 'daily'

### Testing (`__tests__/`)

Tests use helpers from `setup.ts`:
- `block(x, y, letter)` - Create a block at position
- `row(y, letters)` - Create horizontal row of blocks
- `createTestState()` - Empty game state for testing

Engine functions are pure and tested in isolation. Integration tests cover full game scenarios.

### Configuration (`src/lib/constants.ts`)

Game tuning: grid size (8x8), drop speeds, Scrabble letter weights/points, mode configs.
