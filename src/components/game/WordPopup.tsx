import { useEffect, useState } from 'react'

interface WordPopupProps {
  word: string
  score: number
}

export default function WordPopup({ word, score }: WordPopupProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div
        className="text-center"
        style={{
          animation: 'wordPopup 1.5s ease-out forwards',
        }}
      >
        <div
          className="text-3xl font-black text-white mb-1"
          style={{
            textShadow: '0 0 20px rgba(255,230,109,0.8), 0 4px 8px rgba(0,0,0,0.4)',
          }}
        >
          {word}
        </div>
        <div
          className="text-xl font-bold text-accent"
          style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          +{score}
        </div>
      </div>
    </div>
  )
}
