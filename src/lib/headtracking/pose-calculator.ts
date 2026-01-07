// Pure functions for head pose calculation from MediaPipe landmarks

import type { HeadPose, TiltDirection } from './types'
import { HEAD_TRACKING_CONFIG } from '../constants'

// MediaPipe Face Mesh landmark indices
// See: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
const LEFT_EYE_OUTER = 33
const RIGHT_EYE_OUTER = 263
const NOSE_TIP = 1
const FOREHEAD = 10
const CHIN = 152

interface NormalizedLandmark {
  x: number
  y: number
  z: number
}

/**
 * Calculate head pose (yaw, pitch, roll) from MediaPipe face landmarks
 * Returns normalized values from -1 to 1
 */
export function calculateHeadPose(landmarks: NormalizedLandmark[]): HeadPose {
  if (!landmarks || landmarks.length < 468) {
    return { yaw: 0, pitch: 0, roll: 0 }
  }

  const leftEye = landmarks[LEFT_EYE_OUTER]
  const rightEye = landmarks[RIGHT_EYE_OUTER]
  const noseTip = landmarks[NOSE_TIP]
  const forehead = landmarks[FOREHEAD]
  const chin = landmarks[CHIN]

  // Calculate yaw (left/right head turn) using eye positions and nose
  // When head turns left, nose moves left relative to eye midpoint
  const eyeMidpointX = (leftEye.x + rightEye.x) / 2
  const yawOffset = noseTip.x - eyeMidpointX

  // Normalize and amplify yaw (typical range is small)
  // INVERTED because video preview is mirrored - this makes left/right match
  // what the user sees in the mirrored video (like a selfie camera)
  const yaw = Math.max(-1, Math.min(1, -yawOffset * 8))

  // Calculate pitch (up/down head tilt) using nose and forehead/chin
  // When head tilts down, nose moves down relative to face center
  const faceCenterY = (forehead.y + chin.y) / 2
  const pitchOffset = noseTip.y - faceCenterY

  // Normalize pitch - positive = looking down
  const pitch = Math.max(-1, Math.min(1, pitchOffset * 6))

  // Calculate roll (head tilt sideways) using eye angle
  const eyeDeltaY = rightEye.y - leftEye.y
  const eyeDeltaX = rightEye.x - leftEye.x
  const rollAngle = Math.atan2(eyeDeltaY, eyeDeltaX)

  // Normalize roll
  const roll = Math.max(-1, Math.min(1, rollAngle * 2))

  return { yaw, pitch, roll }
}

/**
 * Check if current pose is within neutral zone
 */
export function isInNeutralZone(
  current: HeadPose,
  neutral: HeadPose,
  threshold: number = HEAD_TRACKING_CONFIG.NEUTRAL_THRESHOLD
): boolean {
  const yawDiff = Math.abs(current.yaw - neutral.yaw)
  const pitchDiff = Math.abs(current.pitch - neutral.pitch)

  return yawDiff < threshold && pitchDiff < threshold
}

/**
 * Detect tilt direction from current pose relative to neutral
 * Returns null if within neutral zone or no clear direction
 */
export function detectTiltDirection(
  current: HeadPose,
  neutral: HeadPose,
  tiltThreshold: number = HEAD_TRACKING_CONFIG.TILT_THRESHOLD,
  dropThreshold: number = HEAD_TRACKING_CONFIG.DROP_THRESHOLD
): TiltDirection {
  const yawDiff = current.yaw - neutral.yaw
  const pitchDiff = current.pitch - neutral.pitch

  // Check for down tilt first (pitch takes priority for hard drop)
  if (pitchDiff > dropThreshold) {
    return 'drop'
  }

  // Check for left/right tilt
  if (yawDiff < -tiltThreshold) {
    return 'left'
  }

  if (yawDiff > tiltThreshold) {
    return 'right'
  }

  return null
}

/**
 * Average multiple pose readings for stability
 */
export function averagePoses(poses: HeadPose[]): HeadPose {
  if (poses.length === 0) {
    return { yaw: 0, pitch: 0, roll: 0 }
  }

  const sum = poses.reduce(
    (acc, pose) => ({
      yaw: acc.yaw + pose.yaw,
      pitch: acc.pitch + pose.pitch,
      roll: acc.roll + pose.roll,
    }),
    { yaw: 0, pitch: 0, roll: 0 }
  )

  return {
    yaw: sum.yaw / poses.length,
    pitch: sum.pitch / poses.length,
    roll: sum.roll / poses.length,
  }
}
