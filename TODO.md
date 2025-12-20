# Scramble - Future Features

## Priority Features (From Original Implementation)

### 1. Bonus Words System
- **Description**: Select 3 random target words at game start that players must find
- **Reward**: 3x score multiplier when bonus words are found
- **Victory Condition**: Finding all 3 bonus words triggers victory celebration
- **UI Components needed**:
  - BonusWordTracker panel showing target words
  - Visual highlight when bonus word is found
  - Victory screen on completion

### 2. Speed Calibration (User Settings)
- **Description**: Allow users to customize game speed
- **Options**:
  - Drop speed: Very Slow → Very Fast (0.10 to 0.30 intervals)
  - Level interval: 10, 30, 60, 90, 120 seconds between level-ups
- **When**: Implement with user accounts/login system
- **Storage**: User preferences in localStorage or backend

---

## Nice-to-Have Features

### 3. Grid Size Options
- Allow 6x6, 7x7, or 8x8 grid sizes
- Smaller grids = harder game (less space)
- Could be a Zen mode option

### 4. Random Celebration Messages
- Display fun congratulatory messages when words are found
- Examples: "Amazing!", "Word wizard!", "On fire!"
- Add variety and personality to the game

### 5. Debug/Developer Panel
- Show current speed, level timer countdown
- Useful for testing and balancing
- Toggle via settings or keyboard shortcut

### 6. Victory Screen
- Special celebration when achieving specific goals
- Could work with Daily Challenge mode
- Shareable results (like Wordle)

---

## Technical Debt

- [ ] Implement Daily Challenge seeded RNG (currently same as Classic)
- [ ] Add proper user accounts for personalized settings
- [ ] Consider Vercel KV for global leaderboards (currently localStorage only)
