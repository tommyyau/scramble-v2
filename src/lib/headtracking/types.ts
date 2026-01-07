// Head tracking types

export interface HeadPose {
  yaw: number // Left/right rotation (-1 to 1, negative = left)
  pitch: number // Up/down rotation (-1 to 1, negative = up, positive = down)
  roll: number // Head tilt (not used for controls but available)
}

export type HeadTrackingStatus =
  | 'idle'
  | 'requesting-camera'
  | 'camera-denied'
  | 'loading-model'
  | 'calibrating-neutral' // Capturing neutral head position
  | 'calibrating-left' // Waiting for user to tilt left
  | 'calibrating-left-detected' // Left tilt detected, showing confirmation
  | 'calibrating-right' // Waiting for user to tilt right
  | 'calibrating-right-detected' // Right tilt detected, showing confirmation
  | 'calibrating-down' // Waiting for user to tilt down
  | 'calibrating-down-detected' // Down tilt detected, showing confirmation
  | 'calibration-complete' // All movements verified, ready to start
  | 'active'
  | 'face-lost'
  | 'error'

// Legacy alias for backwards compatibility
export type CalibrationStep = 'neutral' | 'left' | 'right' | 'down' | 'complete'

export type TiltDirection = 'left' | 'right' | 'drop' | null

export interface HeadTrackingState {
  status: HeadTrackingStatus
  error: string | null
  isCalibrated: boolean
  neutralPosition: HeadPose | null
  currentPosition: HeadPose | null
  canTriggerAction: boolean
}

export interface CalibrationResult {
  success: boolean
  neutralPosition: HeadPose | null
  error?: string
}
