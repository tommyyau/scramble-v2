import { useEffect, useState } from 'react'

interface WordPopupProps {
  word: string
  score: number
  chainCount?: number
  streakCount?: number
  bonusWordMatched?: boolean
}

export default function WordPopup({
  word,
  score,
  chainCount = 1,
  streakCount = 1,
  bonusWordMatched = false,
}: WordPopupProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  // Build multiplier badges
  const multipliers: { label: string; value: number; color: string }[] = []

  if (streakCount > 1) {
    multipliers.push({
      label: 'STREAK',
      value: streakCount,
      color: 'bg-orange-500',
    })
  }

  if (chainCount > 1) {
    multipliers.push({
      label: 'CHAIN',
      value: chainCount,
      color: 'bg-purple-500',
    })
  }

  if (bonusWordMatched) {
    multipliers.push({
      label: 'BONUS',
      value: 3,
      color: 'bg-yellow-500',
    })
  }

  const hasMultipliers = multipliers.length > 0

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div
        className="text-center"
        style={{
          animation: 'wordPopup 1.5s ease-out forwards',
        }}
      >
        {/* Word */}
        <div
          className="text-3xl font-black text-white mb-1"
          style={{
            textShadow: '0 0 20px rgba(255,230,109,0.8), 0 4px 8px rgba(0,0,0,0.4)',
          }}
        >
          {word}
        </div>

        {/* Score */}
        <div
          className={`font-bold text-accent ${hasMultipliers ? 'text-3xl' : 'text-xl'}`}
          style={{
            textShadow: hasMultipliers
              ? '0 0 15px rgba(255,230,109,0.6), 0 2px 4px rgba(0,0,0,0.3)'
              : '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          +{score}
        </div>

        {/* Multiplier breakdown */}
        {hasMultipliers && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {multipliers.map((m, i) => (
              <div
                key={m.label}
                className={`${m.color} px-2 py-0.5 rounded-full text-white text-xs font-bold flex items-center gap-1`}
                style={{
                  animation: `fadeIn 0.2s ease-out ${i * 0.1}s both`,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              >
                <span className="text-white/80">{m.value}×</span>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
