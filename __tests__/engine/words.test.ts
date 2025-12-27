import { describe, test, expect } from 'vitest'
import { block, createTestState } from '../setup'
import {
  findWords,
  findHorizontalWords,
  findVerticalWords,
  clearWords,
  checkAndClearWords,
} from '../../src/lib/engine/words'

describe('Word Detection - Horizontal', () => {
  test('finds horizontal word left-to-right', () => {
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
      block(2, 7, 'T', true),
    ]

    const words = findHorizontalWords(blocks)
    expect(words).toHaveLength(1)
    expect(words[0].word).toBe('CAT')
    expect(words[0].blocks).toHaveLength(3)
  })

  test('finds horizontal word right-to-left (TAC becomes CAT)', () => {
    const blocks = [
      block(0, 7, 'T', true),
      block(1, 7, 'A', true),
      block(2, 7, 'C', true),
    ]

    const words = findHorizontalWords(blocks)
    // Should find TAC read left-to-right, and CAT read right-to-left
    const wordTexts = words.map(w => w.word)
    expect(wordTexts).toContain('CAT')
  })

  test('finds 4-letter horizontal word', () => {
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
      block(2, 7, 'T', true),
      block(3, 7, 'S', true),
    ]

    const words = findHorizontalWords(blocks)
    const wordTexts = words.map(w => w.word)
    expect(wordTexts).toContain('CATS')
  })

  test('does not find words with gaps', () => {
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
      // Gap at position 2
      block(3, 7, 'T', true),
    ]

    const words = findHorizontalWords(blocks)
    expect(words.filter(w => w.word === 'CAT')).toHaveLength(0)
  })

  test('finds multiple words on same row', () => {
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
      block(2, 7, 'T', true),
      // Gap
      block(5, 7, 'D', true),
      block(6, 7, 'O', true),
      block(7, 7, 'G', true),
    ]

    const words = findHorizontalWords(blocks)
    const wordTexts = words.map(w => w.word)
    expect(wordTexts).toContain('CAT')
    expect(wordTexts).toContain('DOG')
  })
})

describe('Word Detection - Vertical', () => {
  test('finds vertical word top-to-bottom', () => {
    const blocks = [
      block(0, 5, 'C', true),
      block(0, 6, 'A', true),
      block(0, 7, 'T', true),
    ]

    const words = findVerticalWords(blocks)
    expect(words).toHaveLength(1)
    expect(words[0].word).toBe('CAT')
  })

  test('finds vertical word bottom-to-top (TAC becomes CAT)', () => {
    const blocks = [
      block(0, 5, 'T', true),
      block(0, 6, 'A', true),
      block(0, 7, 'C', true),
    ]

    const words = findVerticalWords(blocks)
    const wordTexts = words.map(w => w.word)
    expect(wordTexts).toContain('CAT')
  })

  test('finds 4-letter vertical word', () => {
    const blocks = [
      block(0, 4, 'C', true),
      block(0, 5, 'A', true),
      block(0, 6, 'T', true),
      block(0, 7, 'S', true),
    ]

    const words = findVerticalWords(blocks)
    const wordTexts = words.map(w => w.word)
    expect(wordTexts).toContain('CATS')
  })

  test('does not find words with gaps', () => {
    const blocks = [
      block(0, 4, 'C', true),
      block(0, 5, 'A', true),
      // Gap at position 6
      block(0, 7, 'T', true),
    ]

    const words = findVerticalWords(blocks)
    expect(words.filter(w => w.word === 'CAT')).toHaveLength(0)
  })
})

describe('Combined Word Finding', () => {
  test('finds both horizontal and vertical words', () => {
    const blocks = [
      // Horizontal CAT
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
      block(2, 7, 'T', true),
      // Vertical DOG
      block(5, 5, 'D', true),
      block(5, 6, 'O', true),
      block(5, 7, 'G', true),
    ]

    const words = findWords(blocks)
    const wordTexts = words.map(w => w.word)
    expect(wordTexts).toContain('CAT')
    expect(wordTexts).toContain('DOG')
  })

  test('does not find 2-letter words', () => {
    const blocks = [
      block(0, 7, 'A', true),
      block(1, 7, 'T', true),
    ]

    const words = findWords(blocks)
    expect(words).toHaveLength(0)
  })

  test('does not find invalid words', () => {
    const blocks = [
      block(0, 7, 'X', true),
      block(1, 7, 'Y', true),
      block(2, 7, 'Z', true),
    ]

    const words = findWords(blocks)
    expect(words).toHaveLength(0)
  })

  test('finds overlapping words', () => {
    // CATS horizontally includes CAT
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
      block(2, 7, 'T', true),
      block(3, 7, 'S', true),
    ]

    const words = findWords(blocks)
    // Should find CATS (and possibly CAT if both are valid)
    expect(words.length).toBeGreaterThanOrEqual(1)
    const wordTexts = words.map(w => w.word)
    expect(wordTexts).toContain('CATS')
  })

  test('finds words within words and reversed words (POTS example)', () => {
    // POTS (P-O-T-S) contains:
    // - POTS (full word, positions 0,1,2,3)
    // - STOP (reverse of POTS)
    // - POT (substring, positions 0,1,2)
    // - TOP (reverse of POT)
    const blocks = [
      block(0, 7, 'P', true),
      block(1, 7, 'O', true),
      block(2, 7, 'T', true),
      block(3, 7, 'S', true),
    ]

    const words = findWords(blocks)
    const wordTexts = words.map(w => w.word)

    // Full word and its reverse
    expect(wordTexts).toContain('POTS')
    expect(wordTexts).toContain('STOP')

    // Substring and its reverse
    expect(wordTexts).toContain('POT')
    expect(wordTexts).toContain('TOP')

    // Should find exactly 4 valid words
    expect(words.length).toBe(4)
  })

  test('finds CATS and CAT (word within word)', () => {
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
      block(2, 7, 'T', true),
      block(3, 7, 'S', true),
    ]

    const words = findWords(blocks)
    const wordTexts = words.map(w => w.word)

    expect(wordTexts).toContain('CATS')
    expect(wordTexts).toContain('CAT')
  })

  test('finds intersecting words', () => {
    // CAT horizontal, intersecting with vertical word using A
    const blocks = [
      block(0, 6, 'C', true),
      block(1, 6, 'A', true),
      block(2, 6, 'T', true),
      // Vertical: using A from CAT
      block(1, 5, 'B', true),
      block(1, 7, 'D', true),
    ]

    const words = findWords(blocks)
    const wordTexts = words.map(w => w.word)
    expect(wordTexts).toContain('CAT')
    // BAD vertically: B-A-D
    expect(wordTexts).toContain('BAD')
  })

  test('only finds words from locked blocks', () => {
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', false), // Unlocked/falling
      block(2, 7, 'T', true),
    ]

    const words = findWords(blocks)
    // Should not find CAT since A is unlocked
    expect(words.filter(w => w.word === 'CAT')).toHaveLength(0)
  })
})

describe('Word Clearing', () => {
  test('clearWords removes word blocks from grid', () => {
    const blocks = [
      block(0, 7, 'C', true),
      block(1, 7, 'A', true),
      block(2, 7, 'T', true),
      block(5, 7, 'X', true), // Not part of word
    ]

    const words = findWords(blocks)
    const remaining = clearWords(blocks, words)

    expect(remaining).toHaveLength(1)
    expect(remaining[0].letter).toBe('X')
  })

  test('clearWords handles overlapping word blocks correctly', () => {
    // If a block is part of two words, it should only be removed once
    const blocks = [
      block(0, 6, 'C', true),
      block(1, 6, 'A', true),
      block(2, 6, 'T', true),
      block(1, 5, 'B', true),
      block(1, 7, 'D', true),
    ]

    const words = findWords(blocks)
    const remaining = clearWords(blocks, words)

    // All blocks should be removed (CAT and BAD share the A)
    expect(remaining).toHaveLength(0)
  })
})

describe('Check and Clear Words', () => {
  test('checkAndClearWords finds and removes words, updates score', () => {
    const state = createTestState({
      blocks: [
        block(0, 7, 'C', true),
        block(1, 7, 'A', true),
        block(2, 7, 'T', true),
      ],
    })

    const result = checkAndClearWords(state)

    expect(result.blocks).toHaveLength(0)
    expect(result.score).toBeGreaterThan(0)
    expect(result.wordsFound).toContain('CAT')
  })

  test('checkAndClearWords returns unchanged state when no words', () => {
    const state = createTestState({
      blocks: [
        block(0, 7, 'X', true),
        block(1, 7, 'Y', true),
        block(2, 7, 'Z', true),
      ],
    })

    const result = checkAndClearWords(state)

    expect(result.blocks).toEqual(state.blocks)
    expect(result.score).toBe(0)
    expect(result.wordsFound).toHaveLength(0)
  })

  test('checkAndClearWords handles multiple words', () => {
    const state = createTestState({
      blocks: [
        block(0, 7, 'C', true),
        block(1, 7, 'A', true),
        block(2, 7, 'T', true),
        block(5, 7, 'D', true),
        block(6, 7, 'O', true),
        block(7, 7, 'G', true),
      ],
    })

    const result = checkAndClearWords(state)

    expect(result.blocks).toHaveLength(0)
    expect(result.wordsFound).toContain('CAT')
    expect(result.wordsFound).toContain('DOG')
  })
})

describe('Long Words', () => {
  test('finds 5-letter words', () => {
    const blocks = [
      block(0, 7, 'H', true),
      block(1, 7, 'O', true),
      block(2, 7, 'U', true),
      block(3, 7, 'S', true),
      block(4, 7, 'E', true),
    ]

    const words = findWords(blocks)
    const wordTexts = words.map(w => w.word)
    expect(wordTexts).toContain('HOUSE')
  })

  test('finds 6-letter words', () => {
    const blocks = [
      block(0, 7, 'B', true),
      block(1, 7, 'R', true),
      block(2, 7, 'I', true),
      block(3, 7, 'D', true),
      block(4, 7, 'G', true),
      block(5, 7, 'E', true),
    ]

    const words = findWords(blocks)
    const wordTexts = words.map(w => w.word)
    expect(wordTexts).toContain('BRIDGE')
  })

  // 7 and 8 letter words removed from dictionary - max word length is now 6
})
