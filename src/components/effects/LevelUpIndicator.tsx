import { useEffect, useState } from 'react'

interface LevelUpIndicatorProps {
  level: number
  onComplete?: () => void
}

export default function LevelUpIndicator({ level, onComplete }: LevelUpIndicatorProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, 1500)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!visible) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
      <div
        className="text-center"
        style={{
          animation: 'levelUp 1.5s ease-out forwards',
        }}
      >
        <div
          className="text-xl font-bold text-secondary mb-1"
          style={{
            textShadow: '0 0 20px rgba(78,205,196,0.8)',
          }}
        >
          LEVEL UP!
        </div>
        <div
          className="text-5xl font-black text-white"
          style={{
            textShadow: '0 0 30px rgba(255,230,109,0.8), 0 4px 8px rgba(0,0,0,0.4)',
          }}
        >
          {level}
        </div>
      </div>
    </div>
  )
}
