import { useEffect, useState } from 'react'

interface ChainIndicatorProps {
  chainCount: number
  onComplete?: () => void
}

export default function ChainIndicator({ chainCount, onComplete }: ChainIndicatorProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (chainCount <= 1) {
      setVisible(false)
      return
    }

    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, 1500)

    return () => clearTimeout(timer)
  }, [chainCount, onComplete])

  if (!visible || chainCount <= 1) return null

  const getChainStyle = () => {
    if (chainCount >= 5) {
      return 'text-5xl text-purple-400 animate-pulse'
    }
    if (chainCount >= 3) {
      return 'text-4xl text-accent'
    }
    return 'text-3xl text-secondary'
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div
        className={`
          font-black animate-bounce-in
          ${getChainStyle()}
        `}
        style={{
          textShadow: '0 0 20px currentColor, 0 4px 8px rgba(0,0,0,0.3)',
        }}
      >
        {chainCount}x CHAIN!
      </div>
    </div>
  )
}
