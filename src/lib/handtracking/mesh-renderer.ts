// Hand mesh rendering utilities for canvas visualization

import { HAND_CONNECTIONS, HAND_LANDMARKS, type Landmark } from './types'

export interface MeshDrawingConfig {
  landmarkRadius: number
  connectionWidth: number
  landmarkColor: string
  connectionColor: string
  highlightColor: string
  indexFingerColor: string
}

const DEFAULT_CONFIG: MeshDrawingConfig = {
  landmarkRadius: 4,
  connectionWidth: 2,
  landmarkColor: '#22c55e', // green-500
  connectionColor: '#16a34a', // green-600
  highlightColor: '#fbbf24', // yellow-400
  indexFingerColor: '#3b82f6', // blue-500
}

/**
 * Draw the hand mesh skeleton on a canvas
 */
export function drawHandMesh(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  config: Partial<MeshDrawingConfig> = {},
  pointingDirection?: 'left' | 'right' | 'drop' | null
): void {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  if (!landmarks || landmarks.length < 21) return

  // Draw connections first (so landmarks appear on top)
  ctx.lineWidth = cfg.connectionWidth
  ctx.lineCap = 'round'

  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const start = landmarks[startIdx]
    const end = landmarks[endIdx]

    // Check if this is part of the index finger (highlight when pointing)
    const isIndexFinger =
      (startIdx >= HAND_LANDMARKS.INDEX_MCP && startIdx <= HAND_LANDMARKS.INDEX_TIP) ||
      (endIdx >= HAND_LANDMARKS.INDEX_MCP && endIdx <= HAND_LANDMARKS.INDEX_TIP)

    ctx.strokeStyle = isIndexFinger && pointingDirection
      ? cfg.indexFingerColor
      : cfg.connectionColor

    ctx.beginPath()
    ctx.moveTo(start.x * width, start.y * height)
    ctx.lineTo(end.x * width, end.y * height)
    ctx.stroke()
  }

  // Draw landmarks
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i]
    const x = lm.x * width
    const y = lm.y * height

    // Determine landmark color
    let color = cfg.landmarkColor
    let radius = cfg.landmarkRadius

    // Highlight index finger tip when pointing
    if (i === HAND_LANDMARKS.INDEX_TIP && pointingDirection) {
      color = cfg.indexFingerColor
      radius = cfg.landmarkRadius * 1.5
    }
    // Highlight wrist
    else if (i === HAND_LANDMARKS.WRIST) {
      color = cfg.highlightColor
    }

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Draw direction indicator arrow if pointing
  if (pointingDirection) {
    drawDirectionArrow(ctx, landmarks, width, height, pointingDirection, cfg)
  }
}

/**
 * Draw an arrow showing the detected pointing direction
 */
function drawDirectionArrow(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  direction: 'left' | 'right' | 'drop',
  cfg: MeshDrawingConfig
): void {
  const indexTip = landmarks[HAND_LANDMARKS.INDEX_TIP]
  const tipX = indexTip.x * width
  const tipY = indexTip.y * height

  // Arrow parameters
  const arrowLength = 30
  const arrowHeadSize = 10

  let endX = tipX
  let endY = tipY

  // Direction determines arrow endpoint
  switch (direction) {
    case 'left':
      endX = tipX - arrowLength
      break
    case 'right':
      endX = tipX + arrowLength
      break
    case 'drop':
      endY = tipY + arrowLength
      break
  }

  // Draw arrow line
  ctx.strokeStyle = cfg.indexFingerColor
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(endX, endY)
  ctx.stroke()

  // Draw arrowhead
  ctx.fillStyle = cfg.indexFingerColor
  ctx.beginPath()

  const angle = Math.atan2(endY - tipY, endX - tipX)
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - arrowHeadSize * Math.cos(angle - Math.PI / 6),
    endY - arrowHeadSize * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    endX - arrowHeadSize * Math.cos(angle + Math.PI / 6),
    endY - arrowHeadSize * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
}

/**
 * Draw a status indicator on the canvas
 * Note: Canvas is CSS-mirrored, so we flip text back to be readable
 */
export function drawStatusIndicator(
  ctx: CanvasRenderingContext2D,
  width: number,
  _height: number,
  status: 'detected' | 'pointing' | 'ready',
  direction?: 'left' | 'right' | 'drop' | null
): void {
  const padding = 8
  const fontSize = 12

  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.textBaseline = 'top'

  let text = ''
  let bgColor = ''
  const textColor = '#ffffff'

  switch (status) {
    case 'detected':
      text = 'Hand Identified'
      bgColor = '#22c55e' // green
      break
    case 'pointing':
      text = direction ? `Pointing ${direction.toUpperCase()}` : 'Pointing'
      bgColor = '#3b82f6' // blue
      break
    case 'ready':
      text = 'Ready'
      bgColor = '#22c55e' // green
      break
  }

  const textWidth = ctx.measureText(text).width
  const boxWidth = textWidth + padding * 2
  const boxHeight = fontSize + padding

  // Save context before flipping
  ctx.save()

  // Flip horizontally to counter the CSS mirror transform
  // This makes text readable in the mirrored canvas
  ctx.scale(-1, 1)
  ctx.translate(-width, 0)

  // Draw background (positioned from left in flipped space = right in displayed space)
  ctx.fillStyle = bgColor
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.roundRect(padding, padding, boxWidth, boxHeight, 4)
  ctx.fill()
  ctx.globalAlpha = 1

  // Draw text
  ctx.textAlign = 'left'
  ctx.fillStyle = textColor
  ctx.fillText(text, padding * 2, padding + 2)

  // Restore context
  ctx.restore()
}
