// Hand tracking types

// MediaPipe hand landmark interface
export interface Landmark {
  x: number // 0-1 normalized (left to right in camera view)
  y: number // 0-1 normalized (top to bottom)
  z: number // Depth (negative = closer to camera)
}

// MediaPipe hand landmark indices
export const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const

// Connections between landmarks for drawing the hand skeleton
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle finger
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring finger
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm connections
  [5, 9], [9, 13], [13, 17],
]

export interface HandPosition {
  x: number // 0-1 normalized position in frame
  y: number // 0-1 normalized position in frame
}

// Full calibration status with all phases
export type HandTrackingStatus =
  | 'idle'
  | 'requesting-camera'
  | 'camera-denied'
  | 'loading-model'
  // Calibration phases
  | 'calibrating-center'      // Capturing center position (~5s)
  | 'countdown-left'          // 3s countdown before left
  | 'calibrating-left'        // 5s capturing left movement
  | 'return-for-right'        // 3s return to center
  | 'countdown-right'         // 3s countdown before right
  | 'calibrating-right'       // 5s capturing right movement
  | 'return-for-down'         // 3s return to center
  | 'countdown-down'          // 3s countdown before down
  | 'calibrating-down'        // 5s capturing down movement
  | 'verification'            // Test movements before game
  // Gameplay
  | 'active'
  | 'hand-lost'
  | 'error'

// State machine for position-based action triggering
export type TriggerState = 'neutral' | 'triggered_left' | 'triggered_right' | 'triggered_drop'

// Position relative to neutral zone
export interface ZonePosition {
  isInNeutralZone: boolean
  direction: HandDirection  // null if in zone, 'left'/'right'/'drop' if outside
  distanceFromCenter: number  // Normalized distance from center
}

// Comprehensive calibration data with personalized thresholds
// The thresholds define both the trigger boundaries AND the visual zone (unified approach)
export interface CalibrationData {
  centerPosition: HandPosition       // Where hand rests naturally
  thresholds: {
    left: number    // How far left triggers action (50% of max left movement)
    right: number   // How far right triggers action
    down: number    // How far down triggers action (40% - more forgiving)
  }
  maxMovements: {
    left: number    // Maximum left distance during calibration
    right: number   // Maximum right distance during calibration
    down: number    // Maximum down distance during calibration
  }
}

export type HandDirection = 'left' | 'right' | 'drop' | null

export interface HandTrackingState {
  status: HandTrackingStatus
  error: string | null
  isCalibrated: boolean
  currentPosition: HandPosition | null
  triggerState: TriggerState
}

// Verification state for testing movements before game
export interface VerificationState {
  leftTested: boolean
  rightTested: boolean
  downTested: boolean
}
