// Head tracking type definitions

// Head pose data calculated from MediaPipe landmarks
export interface HeadPose {
  yaw: number      // Left/right rotation in degrees (-180 to 180)
  pitch: number    // Up/down rotation in degrees (-90 to 90)
  roll: number     // Tilt/rotation in degrees (-180 to 180)
  confidence: number // Detection confidence (0 to 1)
}

// Calibration reference poses and thresholds
export interface CalibrationData {
  neutral: HeadPose
  left: HeadPose
  right: HeadPose
  down: HeadPose
  thresholds: {
    leftYawDelta: number   // Yaw change to trigger left movement
    rightYawDelta: number  // Yaw change to trigger right movement
    downPitchDelta: number // Pitch change to trigger drop
  }
  timestamp: number // When calibration was performed
}

// Current detected gesture from head position
export type HeadGesture = 'neutral' | 'left' | 'right' | 'down' | null

// Calibration flow steps
export type CalibrationStep =
  | 'requesting-camera'
  | 'neutral'
  | 'left'
  | 'right'
  | 'down'
  | 'complete'

// Head tracking hook state
export interface HeadTrackingState {
  isTracking: boolean
  currentPose: HeadPose | null
  currentGesture: HeadGesture
  confidence: number
  error: string | null
}

// Calibration hook state
export interface CalibrationState {
  step: CalibrationStep
  progress: number  // 0-100 for current step
  error: string | null
  calibrationData: CalibrationData | null
}

// MediaPipe landmark indices for head pose calculation
export const LANDMARK_INDICES = {
  NOSE_TIP: 1,
  CHIN: 152,
  LEFT_EAR_TRAGION: 234,
  RIGHT_EAR_TRAGION: 454,
  LEFT_EYE_OUTER: 33,
  RIGHT_EYE_OUTER: 263,
  FOREHEAD: 10,
} as const

// Head tracking configuration
export const HEAD_TRACKING_CONFIG = {
  SAMPLE_DURATION: 1500,       // ms to hold pose during calibration
  CONFIDENCE_THRESHOLD: 0.7,   // Minimum confidence to accept pose
  STABILITY_THRESHOLD: 5,      // Max variance in degrees for stable pose
  THRESHOLD_MULTIPLIER: 0.6,   // Threshold = 60% of full calibrated movement
  ACTION_DEBOUNCE: 150,        // ms between repeated actions
  DETECTION_FPS: 15,           // Target frame rate for detection
} as const
