import { useState, useMemo } from 'react'
import { ArrowLeft, Book, ChevronDown, ChevronUp } from 'lucide-react'
import {
  THREE_LETTER_WORDS,
  FOUR_LETTER_WORDS,
  FIVE_LETTER_WORDS,
  SIX_LETTER_WORDS,
} from '../../lib/dictionary'

interface WordBankProps {
  onBack: () => void
}

export default function WordBank({ onBack }: WordBankProps) {
  const wordLists = useMemo(() => [
    { length: 3, words: Array.from(THREE_LETTER_WORDS).sort() },
    { length: 4, words: Array.from(FOUR_LETTER_WORDS).sort() },
    { length: 5, words: Array.from(FIVE_LETTER_WORDS).sort() },
    { length: 6, words: Array.from(SIX_LETTER_WORDS).sort() },
  ], [])

  const [openSections, setOpenSections] = useState<Set<number>>(new Set([3, 4]))

  const toggleSection = (length: number) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(length)) {
        next.delete(length)
      } else {
        next.add(length)
      }
      return next
    })
  }

  const totalWords = wordLists.reduce((sum, list) => sum + list.words.length, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2">
          <Book size={20} className="text-accent" />
          <span className="font-bold text-white">Word Bank</span>
        </div>
        <div className="text-sm text-slate-400">
          {totalWords.toLocaleString()} words
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-lg mx-auto space-y-3">
          {wordLists.map(({ length, words }) => (
            <div
              key={length}
              className="bg-slate-800/50 rounded-xl overflow-hidden"
            >
              {/* Section header */}
              <button
                onClick={() => toggleSection(length)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-white">{length}</span>
                  <span className="text-slate-400">letter words</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-accent font-medium">
                    {words.length} words
                  </span>
                  {openSections.has(length) ? (
                    <ChevronUp size={20} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={20} className="text-slate-400" />
                  )}
                </div>
              </button>

              {/* Word grid */}
              {openSections.has(length) && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {words.map(word => (
                      <div
                        key={word}
                        className="px-2 py-1 bg-slate-700/50 rounded text-center text-sm font-mono text-slate-300"
                      >
                        {word}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
