import { useEffect, useRef } from 'react'
import type { TriggerState, HandPosition, CalibrationData } from '../../lib/handtracking/types'

interface NeutralZoneOverlayProps {
  calibrationData: CalibrationData
  currentHandPosition: HandPosition | null
  triggerState: TriggerState
  width: number
  height: number
}

// Helper to draw directional tick marks at boundaries
function drawDirectionTick(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 'left' | 'right' | 'down',
  isActive: boolean
) {
  const size = 5
  ctx.strokeStyle = isActive ? '#fbbf24' : 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = isActive ? 2 : 1.5
  ctx.beginPath()

  if (direction === 'left') {
    // Draw < arrow pointing left
    ctx.moveTo(x + size / 2, y - size)
    ctx.lineTo(x - size / 2, y)
    ctx.lineTo(x + size / 2, y + size)
  } else if (direction === 'right') {
    // Draw > arrow pointing right
    ctx.moveTo(x - size / 2, y - size)
    ctx.lineTo(x + size / 2, y)
    ctx.lineTo(x - size / 2, y + size)
  } else {
    // Draw v arrow pointing down
    ctx.moveTo(x - size, y - size / 2)
    ctx.lineTo(x, y + size / 2)
    ctx.lineTo(x + size, y - size / 2)
  }

  ctx.stroke()
}

export function NeutralZoneOverlay({
  calibrationData,
  currentHandPosition,
  triggerState,
  width,
  height,
}: NeutralZoneOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    const { centerPosition, thresholds } = calibrationData

    // Convert normalized to pixel coordinates
    const cx = centerPosition.x * width
    const cy = centerPosition.y * height

    // Convert thresholds to pixels (they're in normalized coordinates)
    const leftPx = thresholds.left * width
    const rightPx = thresholds.right * width
    const downPx = thresholds.down * height

    // Calculate top boundary (no up threshold, so use a fraction of down)
    const topPx = downPx * 0.4

    // Draw asymmetric trigger zone shape matching actual boundaries
    ctx.beginPath()
    ctx.moveTo(cx - leftPx, cy - topPx) // Top-left
    ctx.lineTo(cx - leftPx, cy + downPx) // Bottom-left
    ctx.lineTo(cx + rightPx, cy + downPx) // Bottom-right
    ctx.lineTo(cx + rightPx, cy - topPx) // Top-right
    ctx.closePath()

    // Color based on trigger state
    if (triggerState === 'neutral') {
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)' // Green
      ctx.fillStyle = 'rgba(34, 197, 94, 0.12)'
    } else if (triggerState === 'triggered_drop') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)' // Red for drop
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
    } else {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)' // Blue for left/right
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
    }

    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()

    // Draw directional indicators at trigger boundaries
    drawDirectionTick(ctx, cx - leftPx, cy, 'left', triggerState === 'triggered_left')
    drawDirectionTick(ctx, cx + rightPx, cy, 'right', triggerState === 'triggered_right')
    drawDirectionTick(ctx, cx, cy + downPx, 'down', triggerState === 'triggered_drop')

    // Draw crosshair at center
    ctx.beginPath()
    ctx.moveTo(cx - 4, cy)
    ctx.lineTo(cx + 4, cy)
    ctx.moveTo(cx, cy - 4)
    ctx.lineTo(cx, cy + 4)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Draw current hand position indicator
    if (currentHandPosition) {
      const hx = currentHandPosition.x * width
      const hy = currentHandPosition.y * height

      // Draw line from center to hand position
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(hx, hy)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.stroke()
      ctx.setLineDash([])

      // Draw hand position dot
      ctx.beginPath()
      ctx.arc(hx, hy, 4, 0, Math.PI * 2)

      if (triggerState === 'neutral') {
        ctx.fillStyle = '#22c55e' // Green
      } else if (triggerState === 'triggered_left') {
        ctx.fillStyle = '#3b82f6' // Blue
      } else if (triggerState === 'triggered_right') {
        ctx.fillStyle = '#3b82f6' // Blue
      } else {
        ctx.fillStyle = '#ef4444' // Red for drop
      }

      ctx.fill()
    }
  }, [calibrationData, currentHandPosition, triggerState, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-32 h-24 pointer-events-none transform scale-x-[-1]"
    />
  )
}
