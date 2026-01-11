// Pure functions for position-based hand tracking
// Tracks hand position relative to calibrated center and uses personalized thresholds

import type { HandPosition, HandDirection, Landmark, ZonePosition, CalibrationData } from './types'
import { HAND_LANDMARKS } from './types'
import { HAND_TRACKING_CONFIG } from '../constants'

/**
 * Get hand centroid from palm center (average of MCP joints)
 * Palm center is more stable than wrist and less affected by natural drop
 * when the hand relaxes after movement
 */
export function getHandCentroid(landmarks: Landmark[]): HandPosition {
  if (!landmarks || landmarks.length < 21) {
    return { x: 0.5, y: 0.5 }
  }

  // Use palm center: average of finger base joints (MCP)
  // This is more stable than wrist and less affected by wrist rotation/drop
  const palmJoints = [
    landmarks[HAND_LANDMARKS.INDEX_MCP],
    landmarks[HAND_LANDMARKS.MIDDLE_MCP],
    landmarks[HAND_LANDMARKS.RING_MCP],
    landmarks[HAND_LANDMARKS.PINKY_MCP],
  ]

  const x = palmJoints.reduce((sum, j) => sum + j.x, 0) / 4
  const y = palmJoints.reduce((sum, j) => sum + j.y, 0) / 4

  return { x, y }
}

/**
 * Calculate movement deltas from center position
 * Returns dx (positive = right in mirrored view) and dy (positive = down)
 */
export function calculateMovementDelta(
  handPosition: HandPosition,
  centerPosition: HandPosition
): { dx: number; dy: number; distance: number } {
  // Note: X is inverted because video preview is mirrored
  const dx = centerPosition.x - handPosition.x // Positive = moved right in mirrored view
  const dy = handPosition.y - centerPosition.y // Positive = moved down
  const distance = Math.sqrt(dx * dx + dy * dy)

  return { dx, dy, distance }
}

/**
 * Check if hand position triggers an action using personalized thresholds
 * UNIFIED APPROACH: The thresholds ARE the zone boundaries
 * - If hand is within ALL thresholds, it's in the "neutral zone"
 * - If hand exceeds a threshold in a direction, that action triggers
 */
export function checkNeutralZonePersonalized(
  handPosition: HandPosition,
  calibrationData: CalibrationData
): ZonePosition {
  const { dx, dy, distance } = calculateMovementDelta(handPosition, calibrationData.centerPosition)
  const { thresholds } = calibrationData

  // Check which threshold is exceeded (if any)
  // Positive dx = right, Negative dx = left
  // Positive dy = down
  const exceedsLeft = dx < 0 && Math.abs(dx) > thresholds.left
  const exceedsRight = dx > 0 && dx > thresholds.right
  const exceedsDown = dy > 0 && dy > thresholds.down

  // Determine direction - use absolute values for dominance check
  // Reduced dominance requirement: 0.8x for horizontal, 0.6x for down
  let direction: HandDirection = null
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)

  if (exceedsLeft && absX > absY * 0.8) {
    direction = 'left'
  } else if (exceedsRight && absX > absY * 0.8) {
    direction = 'right'
  } else if (exceedsDown && absY > absX * 0.6) {
    // Down has reduced dominance requirement (0.6x instead of 0.8x)
    // This makes it easier to trigger down without needing perfect vertical movement
    direction = 'drop'
  }

  // "In neutral zone" means not exceeding ANY threshold
  const isInNeutralZone = !exceedsLeft && !exceedsRight && !exceedsDown

  return {
    isInNeutralZone,
    direction,
    distanceFromCenter: distance,
  }
}

/**
 * Simple neutral zone check (for verification phase or before full calibration)
 * Uses provided thresholds directly for the zone check
 */
export function checkNeutralZone(
  handPosition: HandPosition,
  centerPosition: HandPosition,
  thresholds: { left: number; right: number; down: number }
): ZonePosition {
  const { dx, dy, distance } = calculateMovementDelta(handPosition, centerPosition)

  // Check which threshold is exceeded
  const exceedsLeft = dx < 0 && Math.abs(dx) > thresholds.left
  const exceedsRight = dx > 0 && dx > thresholds.right
  const exceedsDown = dy > 0 && dy > thresholds.down

  const isInNeutralZone = !exceedsLeft && !exceedsRight && !exceedsDown

  let direction: HandDirection = null
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)

  // Use same dominance logic as main detection
  if (exceedsLeft && absX > absY * 0.8) {
    direction = 'left'
  } else if (exceedsRight && absX > absY * 0.8) {
    direction = 'right'
  } else if (exceedsDown && absY > absX * 0.6) {
    direction = 'drop'
  }

  return {
    isInNeutralZone,
    direction,
    distanceFromCenter: distance,
  }
}

/**
 * Create initial calibration data structure
 * Thresholds and maxMovements are filled in during calibration
 */
export function createInitialCalibrationData(centerPosition: HandPosition): CalibrationData {
  return {
    centerPosition,
    thresholds: {
      left: 0,
      right: 0,
      down: 0,
    },
    maxMovements: {
      left: 0,
      right: 0,
      down: 0,
    },
  }
}

/**
 * Calculate thresholds from max movements
 * Uses direction-specific ratios: 50% for horizontal, 40% for down (more forgiving)
 */
export function calculateThresholds(maxMovements: CalibrationData['maxMovements']): CalibrationData['thresholds'] {
  const horizontalRatio = HAND_TRACKING_CONFIG.THRESHOLD_RATIO_HORIZONTAL
  const downRatio = HAND_TRACKING_CONFIG.THRESHOLD_RATIO_DOWN

  return {
    left: maxMovements.left * horizontalRatio,
    right: maxMovements.right * horizontalRatio,
    down: maxMovements.down * downRatio,
  }
}

/**
 * Average multiple hand positions for stability during center calibration
 */
export function averagePositions(positions: HandPosition[]): HandPosition {
  if (positions.length === 0) {
    return { x: 0.5, y: 0.5 }
  }

  let sumX = 0, sumY = 0
  for (const pos of positions) {
    sumX += pos.x
    sumY += pos.y
  }

  return {
    x: sumX / positions.length,
    y: sumY / positions.length,
  }
}

/**
 * Average multiple landmark readings for stability during calibration
 */
export function averageLandmarks(samples: Landmark[][]): Landmark[] {
  if (samples.length === 0) {
    return []
  }

  const numLandmarks = samples[0].length
  const result: Landmark[] = []

  for (let i = 0; i < numLandmarks; i++) {
    let sumX = 0, sumY = 0, sumZ = 0
    for (const sample of samples) {
      sumX += sample[i].x
      sumY += sample[i].y
      sumZ += sample[i].z
    }
    result.push({
      x: sumX / samples.length,
      y: sumY / samples.length,
      z: sumZ / samples.length,
    })
  }

  return result
}

/**
 * Apply exponential moving average smoothing to reduce jitter
 */
export function smoothPosition(
  current: HandPosition,
  previous: HandPosition | null,
  alpha: number = HAND_TRACKING_CONFIG.SMOOTHING_ALPHA
): HandPosition {
  if (!previous) {
    return current
  }
  return {
    x: alpha * current.x + (1 - alpha) * previous.x,
    y: alpha * current.y + (1 - alpha) * previous.y,
  }
}

/**
 * Smooth landmarks array using exponential moving average
 */
export function smoothLandmarks(
  current: Landmark[],
  previous: Landmark[] | null,
  alpha: number = HAND_TRACKING_CONFIG.SMOOTHING_ALPHA
): Landmark[] {
  if (!previous || previous.length !== current.length) {
    return current
  }
  return current.map((lm, i) => ({
    x: alpha * lm.x + (1 - alpha) * previous[i].x,
    y: alpha * lm.y + (1 - alpha) * previous[i].y,
    z: alpha * lm.z + (1 - alpha) * previous[i].z,
  }))
}
