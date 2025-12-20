import { useEffect, useState } from 'react'

interface FloatingScoreProps {
  score: number
  x: number
  y: number
  onComplete: () => void
}

export default function FloatingScore({ score, x, y, onComplete }: FloatingScoreProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onComplete()
    }, 1000)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!visible) return null

  return (
    <div
      className="absolute pointer-events-none animate-float-up font-bold text-xl text-accent"
      style={{
        left: x,
        top: y,
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }}
    >
      +{score}
    </div>
  )
}
