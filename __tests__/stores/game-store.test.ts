import { describe, test, expect, beforeEach } from 'vitest'
import { useGameStore } from '../../src/stores/game'
import { GRID_HEIGHT, GRID_WIDTH } from '../../src/lib/constants'

/**
 * Store integration tests to verify the game store works correctly
 * with the new processBlockLocked function.
 */
describe('GameStore integration', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.getState().reset()
  })

  describe('startGame', () => {
    test('initializes state correctly for classic mode', () => {
      useGameStore.getState().startGame('classic')
      const state = useGameStore.getState()

      expect(state.mode).toBe('classic')
      expect(state.score).toBe(0)
      expect(state.level).toBe(1)
      expect(state.gameOver).toBe(false)
      expect(state.isPaused).toBe(false)
      expect(state.wordsFound).toEqual([])
      expect(state.currentStreak).toBe(0)
      expect(state.stats.totalWordsFound).toBe(0)
      expect(state.stats.wordHistory).toEqual([])
    })

    test('spawns initial block with next letter preview', () => {
      useGameStore.getState().startGame('classic')
      const state = useGameStore.getState()

      // Should have an active (unlocked) block
      const activeBlock = state.blocks.find(b => !b.locked)
      expect(activeBlock).toBeDefined()
      expect(activeBlock!.letter).toMatch(/[A-Z]/)

      // Should have next letter preview
      expect(state.nextLetter).toMatch(/[A-Z]/)
    })

    test('initializes bonus word for classic mode', () => {
      useGameStore.getState().startGame('classic')
      const state = useGameStore.getState()

      expect(state.mode).toBe('classic')
      expect(state.currentBonusWord).toMatch(/^[A-Z]{4}$/) // 4-letter word
    })
  })

  describe('movement controls', () => {
    test('moveLeft moves block left when possible', () => {
      useGameStore.getState().startGame('classic')
      const state = useGameStore.getState()
      const activeBlock = state.blocks.find(b => !b.locked)!
      const originalX = activeBlock.x

      // Move block to a position where left is valid
      if (originalX === 0) {
        useGameStore.getState().moveRight()
      }

      const beforeX = useGameStore.getState().blocks.find(b => !b.locked)!.x
      useGameStore.getState().moveLeft()
      const afterX = useGameStore.getState().blocks.find(b => !b.locked)!.x

      expect(afterX).toBe(beforeX - 1)
    })

    test('moveRight moves block right when possible', () => {
      useGameStore.getState().startGame('classic')
      const state = useGameStore.getState()
      const activeBlock = state.blocks.find(b => !b.locked)!
      const originalX = activeBlock.x

      // Move block to a position where right is valid
      if (originalX === GRID_WIDTH - 1) {
        useGameStore.getState().moveLeft()
      }

      const beforeX = useGameStore.getState().blocks.find(b => !b.locked)!.x
      useGameStore.getState().moveRight()
      const afterX = useGameStore.getState().blocks.find(b => !b.locked)!.x

      expect(afterX).toBe(beforeX + 1)
    })
  })

  describe('drop mechanics', () => {
    test('drop() moves block to bottom and locks it', () => {
      useGameStore.getState().startGame('classic')
      const activeBlock = useGameStore.getState().blocks.find(b => !b.locked)!
      const originalX = activeBlock.x

      useGameStore.getState().drop()
      const state = useGameStore.getState()

      // If no words formed, the block should be locked at bottom
      // and a new block should be spawned
      if (!state.isCelebrating) {
        // Find the locked block at the original x position
        const lockedBlock = state.blocks.find(b => b.locked && b.x === originalX)
        expect(lockedBlock).toBeDefined()
        expect(lockedBlock!.y).toBe(GRID_HEIGHT - 1)
      }
    })

    test('drop() spawns new block when no words formed', () => {
      useGameStore.getState().startGame('classic')
      const initialNextLetter = useGameStore.getState().nextLetter

      useGameStore.getState().drop()
      const state = useGameStore.getState()

      // If no words formed, should have spawned next block
      if (!state.isCelebrating) {
        const activeBlock = state.blocks.find(b => !b.locked)
        expect(activeBlock).toBeDefined()
        expect(activeBlock!.letter).toBe(initialNextLetter)
        expect(state.nextLetter).not.toBe(initialNextLetter) // New preview
      }
    })
  })

  describe('game tick', () => {
    test('gameTick() moves active block down', () => {
      useGameStore.getState().startGame('classic')
      const beforeY = useGameStore.getState().blocks.find(b => !b.locked)!.y

      useGameStore.getState().gameTick()
      const afterY = useGameStore.getState().blocks.find(b => !b.locked)!.y

      expect(afterY).toBe(beforeY + 1)
    })

    test('gameTick() locks block when it reaches bottom', () => {
      useGameStore.getState().startGame('classic')

      // Move block to just above bottom
      while (true) {
        const activeBlock = useGameStore.getState().blocks.find(b => !b.locked)
        if (!activeBlock || activeBlock.y >= GRID_HEIGHT - 2) break
        useGameStore.getState().gameTick()
      }

      // One more tick should lock it
      useGameStore.getState().gameTick()
      const state = useGameStore.getState()

      // Either celebrating or new block spawned
      if (!state.isCelebrating) {
        // Should have a new active block (spawned after lock)
        const activeBlocks = state.blocks.filter(b => !b.locked)
        expect(activeBlocks.length).toBe(1)
      }
    })
  })

  describe('pause/resume', () => {
    test('pauseGame prevents gameTick from moving block', () => {
      useGameStore.getState().startGame('classic')
      const beforeY = useGameStore.getState().blocks.find(b => !b.locked)!.y

      useGameStore.getState().pauseGame()
      useGameStore.getState().gameTick()
      const afterY = useGameStore.getState().blocks.find(b => !b.locked)!.y

      expect(afterY).toBe(beforeY) // Should not have moved
      expect(useGameStore.getState().isPaused).toBe(true)
    })

    test('resumeGame allows gameTick to work again', () => {
      useGameStore.getState().startGame('classic')
      useGameStore.getState().pauseGame()
      useGameStore.getState().resumeGame()

      const beforeY = useGameStore.getState().blocks.find(b => !b.locked)!.y
      useGameStore.getState().gameTick()
      const afterY = useGameStore.getState().blocks.find(b => !b.locked)!.y

      expect(afterY).toBe(beforeY + 1)
      expect(useGameStore.getState().isPaused).toBe(false)
    })
  })

  describe('stats tracking', () => {
    test('stats start at zero', () => {
      useGameStore.getState().startGame('classic')
      const state = useGameStore.getState()

      expect(state.stats.totalWordsFound).toBe(0)
      expect(state.stats.longestWord).toBe('')
      expect(state.stats.bestChain).toBe(0)
      expect(state.stats.bestStreak).toBe(0)
      expect(state.stats.wordHistory).toHaveLength(0)
    })
  })

  describe('reset', () => {
    test('reset() clears all state', () => {
      useGameStore.getState().startGame('classic')
      // Play a bit
      useGameStore.getState().gameTick()
      useGameStore.getState().drop()

      useGameStore.getState().reset()
      const state = useGameStore.getState()

      expect(state.blocks).toEqual([])
      expect(state.score).toBe(0)
      expect(state.level).toBe(1)
      expect(state.gameOver).toBe(false)
      expect(state.wordsFound).toEqual([])
      expect(state.currentStreak).toBe(0)
    })
  })

  describe('level progression', () => {
    test('levelUp increases level and triggers event', () => {
      useGameStore.getState().startGame('classic')
      expect(useGameStore.getState().level).toBe(1)

      useGameStore.getState().levelUp()
      const state = useGameStore.getState()

      expect(state.level).toBe(2)
      expect(state.levelUpEvent).toBe(2)
    })
  })

  describe('UI state helpers', () => {
    test('endShake clears shake flag', () => {
      useGameStore.setState({ isShaking: true })

      useGameStore.getState().endShake()

      expect(useGameStore.getState().isShaking).toBe(false)
    })

    test('clearParticles clears particle event', () => {
      useGameStore.setState({
        particleEvent: { id: 1, positions: [] },
      })

      useGameStore.getState().clearParticles()

      expect(useGameStore.getState().particleEvent).toBeNull()
    })

    test('clearLevelUp clears level up event', () => {
      useGameStore.setState({ levelUpEvent: 5 })

      useGameStore.getState().clearLevelUp()

      expect(useGameStore.getState().levelUpEvent).toBeNull()
    })

    test('clearStreakBroken clears streak broken flag', () => {
      useGameStore.setState({ streakBroken: true })

      useGameStore.getState().clearStreakBroken()

      expect(useGameStore.getState().streakBroken).toBe(false)
    })

    test('clearBonusWordMatched clears bonus matched flag', () => {
      useGameStore.setState({ bonusWordMatched: true })

      useGameStore.getState().clearBonusWordMatched()

      expect(useGameStore.getState().bonusWordMatched).toBe(false)
    })
  })
})
