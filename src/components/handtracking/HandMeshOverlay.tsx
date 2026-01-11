import { useRef, useEffect } from 'react'
import type { Landmark, HandDirection } from '../../lib/handtracking/types'
import { drawHandMesh, drawStatusIndicator } from '../../lib/handtracking/mesh-renderer'

interface HandMeshOverlayProps {
  landmarks: Landmark[] | null
  width: number
  height: number
  isDetected: boolean
  direction: HandDirection
  className?: string
}

export function HandMeshOverlay({
  landmarks,
  width,
  height,
  isDetected,
  direction,
  className = '',
}: HandMeshOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw hand mesh if landmarks available
    if (landmarks && landmarks.length >= 21) {
      drawHandMesh(ctx, landmarks, width, height, {}, direction)

      // Draw status
      if (direction) {
        drawStatusIndicator(ctx, width, height, 'pointing', direction)
      } else if (isDetected) {
        drawStatusIndicator(ctx, width, height, 'detected')
      }
    }
  }, [landmarks, width, height, isDetected, direction])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`pointer-events-none ${className}`}
    />
  )
}
