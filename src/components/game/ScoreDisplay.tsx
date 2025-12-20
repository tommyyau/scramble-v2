import { useEffect, useRef, useState } from 'react'

interface ScoreDisplayProps {
  score: number
  label?: string
}

export default function ScoreDisplay({ score, label = 'Score' }: ScoreDisplayProps) {
  const [displayScore, setDisplayScore] = useState(score)
  const prevScore = useRef(score)

  // Animate score counting up
  useEffect(() => {
    if (score === prevScore.current) return

    const diff = score - prevScore.current
    const duration = Math.min(500, Math.abs(diff) * 10)
    const steps = Math.min(20, Math.abs(diff))
    const increment = diff / steps

    let current = prevScore.current
    let step = 0

    const timer = setInterval(() => {
      step++
      current += increment
      setDisplayScore(Math.round(current))

      if (step >= steps) {
        clearInterval(timer)
        setDisplayScore(score)
      }
    }, duration / steps)

    prevScore.current = score

    return () => clearInterval(timer)
  }, [score])

  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className="text-3xl font-bold text-white tabular-nums">
        {displayScore.toLocaleString()}
      </div>
    </div>
  )
}
