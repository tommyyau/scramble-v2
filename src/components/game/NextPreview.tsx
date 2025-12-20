interface NextPreviewProps {
  letter: string | null
}

// Define colors and whether they need dark text for contrast
const blockStyles: Record<string, { bg: string; darkText: boolean }> = {
  // Vowels - warm colors
  A: { bg: '#FF6B6B', darkText: false },
  E: { bg: '#FFE66D', darkText: true },
  I: { bg: '#FF9FF3', darkText: true },
  O: { bg: '#FFA07A', darkText: true },
  U: { bg: '#FFB347', darkText: true },
  // Common consonants - teal
  R: { bg: '#4ECDC4', darkText: false },
  S: { bg: '#4ECDC4', darkText: false },
  T: { bg: '#4ECDC4', darkText: false },
  L: { bg: '#4ECDC4', darkText: false },
  N: { bg: '#4ECDC4', darkText: false },
  // Rare letters - purple
  Q: { bg: '#A66CFF', darkText: false },
  X: { bg: '#A66CFF', darkText: false },
  Z: { bg: '#A66CFF', darkText: false },
  J: { bg: '#A66CFF', darkText: false },
  K: { bg: '#A66CFF', darkText: false },
}

const defaultStyle = { bg: '#48DBFB', darkText: false }

const getBlockStyle = (letter: string): React.CSSProperties => {
  const style = blockStyles[letter] || defaultStyle
  return {
    backgroundColor: style.bg,
    color: style.darkText ? '#1a1a2e' : '#ffffff',
  }
}

export default function NextPreview({ letter }: NextPreviewProps) {
  if (!letter) return null

  const style = getBlockStyle(letter)

  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Next</div>
      <div
        className="
          w-12 h-12 rounded-lg
          flex items-center justify-center
          font-bold text-xl
          shadow-md mx-auto
        "
        style={{
          ...style,
          boxShadow: `inset 0 -2px 4px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)`,
        }}
      >
        {letter}
      </div>
    </div>
  )
}
