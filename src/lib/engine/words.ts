import { Block, GameState, FoundWord } from '../types'
import { GRID_WIDTH, GRID_HEIGHT, MIN_WORD_LENGTH } from '../constants'
import { isValidWord } from '../dictionary/words'
import { calculateWordScore, isRareWord } from './scoring'

/**
 * Find all horizontal words in the grid
 */
export function findHorizontalWords(blocks: Block[]): FoundWord[] {
  const words: FoundWord[] = []
  const lockedBlocks = blocks.filter(b => b.locked)

  // Check each row
  for (let y = 0; y < GRID_HEIGHT; y++) {
    // Get blocks in this row, sorted by x
    const rowBlocks = lockedBlocks
      .filter(b => b.y === y)
      .sort((a, b) => a.x - b.x)

    if (rowBlocks.length < MIN_WORD_LENGTH) continue

    // Find contiguous runs of blocks
    let runStart = 0
    for (let i = 1; i <= rowBlocks.length; i++) {
      // Check if this is end of a run (gap or end of blocks)
      const isEndOfRun =
        i === rowBlocks.length ||
        rowBlocks[i].x !== rowBlocks[i - 1].x + 1

      if (isEndOfRun) {
        const run = rowBlocks.slice(runStart, i)
        if (run.length >= MIN_WORD_LENGTH) {
          // Check all possible words in this run (3 letters and up)
          for (let start = 0; start < run.length; start++) {
            for (let end = start + MIN_WORD_LENGTH; end <= run.length; end++) {
              const segment = run.slice(start, end)
              const word = segment.map(b => b.letter).join('')

              // Check forward and reverse
              if (isValidWord(word)) {
                words.push({
                  word,
                  blocks: segment,
                  direction: 'horizontal',
                  isRare: isRareWord(word),
                })
              }

              const reversed = word.split('').reverse().join('')
              if (reversed !== word && isValidWord(reversed)) {
                words.push({
                  word: reversed,
                  blocks: segment,
                  direction: 'horizontal',
                  isRare: isRareWord(reversed),
                })
              }
            }
          }
        }
        runStart = i
      }
    }
  }

  return words
}

/**
 * Find all vertical words in the grid
 */
export function findVerticalWords(blocks: Block[]): FoundWord[] {
  const words: FoundWord[] = []
  const lockedBlocks = blocks.filter(b => b.locked)

  // Check each column
  for (let x = 0; x < GRID_WIDTH; x++) {
    // Get blocks in this column, sorted by y
    const colBlocks = lockedBlocks
      .filter(b => b.x === x)
      .sort((a, b) => a.y - b.y)

    if (colBlocks.length < MIN_WORD_LENGTH) continue

    // Find contiguous runs of blocks
    let runStart = 0
    for (let i = 1; i <= colBlocks.length; i++) {
      // Check if this is end of a run (gap or end of blocks)
      const isEndOfRun =
        i === colBlocks.length ||
        colBlocks[i].y !== colBlocks[i - 1].y + 1

      if (isEndOfRun) {
        const run = colBlocks.slice(runStart, i)
        if (run.length >= MIN_WORD_LENGTH) {
          // Check all possible words in this run (3 letters and up)
          for (let start = 0; start < run.length; start++) {
            for (let end = start + MIN_WORD_LENGTH; end <= run.length; end++) {
              const segment = run.slice(start, end)
              const word = segment.map(b => b.letter).join('')

              // Check forward and reverse
              if (isValidWord(word)) {
                words.push({
                  word,
                  blocks: segment,
                  direction: 'vertical',
                  isRare: isRareWord(word),
                })
              }

              const reversed = word.split('').reverse().join('')
              if (reversed !== word && isValidWord(reversed)) {
                words.push({
                  word: reversed,
                  blocks: segment,
                  direction: 'vertical',
                  isRare: isRareWord(reversed),
                })
              }
            }
          }
        }
        runStart = i
      }
    }
  }

  return words
}

/**
 * Find all valid words (horizontal and vertical)
 */
export function findWords(blocks: Block[]): FoundWord[] {
  const horizontal = findHorizontalWords(blocks)
  const vertical = findVerticalWords(blocks)
  return [...horizontal, ...vertical]
}

/**
 * Clear words from the grid
 */
export function clearWords(blocks: Block[], words: FoundWord[]): Block[] {
  // Collect all blocks that are part of any word
  const blocksToRemove = new Set<Block>()
  words.forEach(word => {
    word.blocks.forEach(block => blocksToRemove.add(block))
  })

  return blocks.filter(b => !blocksToRemove.has(b))
}

/**
 * Check for words and clear them, updating score
 */
export function checkAndClearWords(state: GameState): GameState {
  const words = findWords(state.blocks)

  if (words.length === 0) {
    return state
  }

  // Calculate score for all words
  let totalScore = 0
  const wordTexts: string[] = []

  // Remove duplicates (same word found from different directions)
  const uniqueWords = new Map<string, FoundWord>()
  words.forEach(w => {
    // Use word text + block positions as key
    const key = w.word + w.blocks.map(b => `${b.x},${b.y}`).join('|')
    if (!uniqueWords.has(key)) {
      uniqueWords.set(key, w)
    }
  })

  uniqueWords.forEach(word => {
    const score = calculateWordScore(word.word, {
      chainMultiplier: state.chainMultiplier,
      isRare: word.isRare,
    })
    totalScore += score
    if (!wordTexts.includes(word.word)) {
      wordTexts.push(word.word)
    }
  })

  // Clear the word blocks
  const remainingBlocks = clearWords(state.blocks, Array.from(uniqueWords.values()))

  return {
    ...state,
    blocks: remainingBlocks,
    score: state.score + totalScore,
    wordsFound: [...state.wordsFound, ...wordTexts],
  }
}
