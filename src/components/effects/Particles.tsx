import { useEffect, useState, useMemo } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  color: string
  size: number
  angle: number
  speed: number
  delay: number
}

interface ParticlesProps {
  x: number
  y: number
  count?: number
  colors?: string[]
  onComplete?: () => void
}

export default function Particles({
  x,
  y,
  count = 12,
  colors = ['#FFE66D', '#FF6B6B', '#4ECDC4', '#A66CFF', '#48DBFB'],
  onComplete,
}: ParticlesProps) {
  const [visible, setVisible] = useState(true)

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 0,
      y: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 8,
      angle: (Math.PI * 2 * i) / count + Math.random() * 0.5,
      speed: 40 + Math.random() * 60,
      delay: Math.random() * 100,
    }))
  }, [count, colors])

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, 800)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!visible) return null

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: x, top: y }}
    >
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-sparkle"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            transform: `translate(${Math.cos(particle.angle) * particle.speed}px, ${
              Math.sin(particle.angle) * particle.speed
            }px)`,
            animationDelay: `${particle.delay}ms`,
            boxShadow: `0 0 ${particle.size}px ${particle.color}`,
          }}
        />
      ))}
    </div>
  )
}
