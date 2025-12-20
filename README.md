# Scramble

A word-finding puzzle game built with React, TypeScript, and Vite.

## Game Modes

- **Classic**: Blocks fall with increasing speed. Find words to survive!
- **Zen**: No timer, no pressure. Blocks drop when you want.
- **Sprint**: 2 minutes to score as high as possible!
- **Daily Challenge**: Same puzzle for everyone. Compare scores!

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Tech Stack

- React 18
- TypeScript
- Vite
- Zustand (state management)
- Tailwind CSS
- Vitest (testing)

## Features

- Smart letter generation (prevents impossible situations)
- Chain/combo system with visual effects
- Sound effects
- Leaderboard (localStorage)
- Word bank browser
- Mobile-optimized with swipe controls

## Future Features

See [TODO.md](./TODO.md) for planned features including:
- Bonus words system (3x multiplier)
- Speed calibration settings
- Victory screen
