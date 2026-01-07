// Head pose detection using MediaPipe Face Mesh

// MediaPipe types (loaded from CDN via window globals)
type NormalizedLandmark = { x: number; y: number; z: number }
type NormalizedLandmarkList = NormalizedLandmark[]
type Results = {
  multiFaceLandmarks?: NormalizedLandmarkList[]
}

import {
  HeadPose,
  CalibrationData,
  HeadGesture,
  LANDMARK_INDICES,
  HEAD_TRACKING_CONFIG,
} from './types'

// FaceMesh instance type
type FaceMeshInstance = {
  setOptions: (options: Record<string, unknown>) => void
  onResults: (callback: (results: Results) => void) => void
  send: (input: { image: HTMLVideoElement }) => Promise<void>
  close: () => void
}

// Initialize MediaPipe Face Mesh
export function createFaceMesh(onResults: (results: Results) => void): FaceMeshInstance {
  // Access FaceMesh from window (loaded via CDN script tags in index.html)
  const FaceMeshClass = (window as unknown as { FaceMesh?: new (config: { locateFile: (file: string) => string }) => FaceMeshInstance }).FaceMesh
  if (!FaceMeshClass) {
    throw new Error('MediaPipe FaceMesh not loaded. Check CDN script tags in index.html.')
  }

  const faceMesh = new FaceMeshClass({
    locateFile: (file: string) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    },
  })

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })

  faceMesh.onResults(onResults)

  return faceMesh
}

// Camera instance type
type CameraInstance = {
  start: () => Promise<void>
  stop: () => void
}

// Create camera instance for video capture
export function createCamera(
  videoElement: HTMLVideoElement,
  faceMesh: FaceMeshInstance,
  _fps: number = HEAD_TRACKING_CONFIG.DETECTION_FPS
): CameraInstance {
  // Access Camera from window (loaded via CDN script tags in index.html)
  const CameraClass = (window as unknown as { Camera?: new (video: HTMLVideoElement, config: Record<string, unknown>) => CameraInstance }).Camera
  if (!CameraClass) {
    throw new Error('MediaPipe Camera not loaded. Check CDN script tags in index.html.')
  }

  return new CameraClass(videoElement, {
    onFrame: async () => {
      await faceMesh.send({ image: videoElement })
    },
    width: 640,
    height: 480,
    facingMode: 'user', // Front camera for mobile
  })
}

// Calculate head pose from facial landmarks
export function calculateHeadPose(landmarks: NormalizedLandmarkList): HeadPose {
  const noseTip = landmarks[LANDMARK_INDICES.NOSE_TIP]
  const chin = landmarks[LANDMARK_INDICES.CHIN]
  const leftEar = landmarks[LANDMARK_INDICES.LEFT_EAR_TRAGION]
  const rightEar = landmarks[LANDMARK_INDICES.RIGHT_EAR_TRAGION]
  const leftEye = landmarks[LANDMARK_INDICES.LEFT_EYE_OUTER]
  const rightEye = landmarks[LANDMARK_INDICES.RIGHT_EYE_OUTER]
  const forehead = landmarks[LANDMARK_INDICES.FOREHEAD]

  // Calculate ear midpoint
  const earMidX = (leftEar.x + rightEar.x) / 2

  // Yaw: horizontal rotation (left/right)
  // Compare nose position to ear midpoint
  // Positive = turned right, Negative = turned left
  const yawOffset = noseTip.x - earMidX
  const earDistance = Math.abs(rightEar.x - leftEar.x)
  const yaw = (yawOffset / earDistance) * 90 // Scale to approximate degrees

  // Pitch: vertical rotation (up/down)
  // Compare nose to chin vertical position
  // Positive = looking up, Negative = looking down
  const faceHeight = Math.abs(chin.y - forehead.y)
  const noseVerticalPos = (noseTip.y - forehead.y) / faceHeight
  // Neutral is around 0.4-0.5, lower = looking up, higher = looking down
  const pitch = (noseVerticalPos - 0.45) * -180 // Scale and invert

  // Roll: head tilt
  // Compare eye heights
  const eyeDeltaY = rightEye.y - leftEye.y
  const eyeDeltaX = rightEye.x - leftEye.x
  const roll = Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI)

  // Confidence based on face visibility
  // Use Z coordinates to estimate if face is well-positioned
  const avgZ = (noseTip.z + leftEye.z + rightEye.z) / 3
  const confidence = Math.max(0, Math.min(1, 1 - Math.abs(avgZ) * 5))

  return { yaw, pitch, roll, confidence }
}

// Detect gesture from current pose relative to calibration
export function detectGesture(
  currentPose: HeadPose,
  calibration: CalibrationData
): HeadGesture {
  const { neutral, thresholds } = calibration

  // Calculate deltas from neutral position
  const yawDelta = currentPose.yaw - neutral.yaw
  const pitchDelta = currentPose.pitch - neutral.pitch

  // Check thresholds (with hysteresis for stability)
  // Looking left = negative yaw delta
  if (yawDelta < -thresholds.leftYawDelta) {
    return 'left'
  }

  // Looking right = positive yaw delta
  if (yawDelta > thresholds.rightYawDelta) {
    return 'right'
  }

  // Looking down = negative pitch delta
  if (pitchDelta < -thresholds.downPitchDelta) {
    return 'down'
  }

  return 'neutral'
}

// Check if pose is within neutral zone
export function isInNeutralZone(
  currentPose: HeadPose,
  calibration: CalibrationData,
  hysteresisPercent: number = 0.3
): boolean {
  const { neutral, thresholds } = calibration

  const yawDelta = Math.abs(currentPose.yaw - neutral.yaw)
  const pitchDelta = Math.abs(currentPose.pitch - neutral.pitch)

  // Use reduced thresholds for neutral detection (hysteresis)
  const leftThreshold = thresholds.leftYawDelta * hysteresisPercent
  const rightThreshold = thresholds.rightYawDelta * hysteresisPercent
  const downThreshold = thresholds.downPitchDelta * hysteresisPercent

  return yawDelta < Math.min(leftThreshold, rightThreshold) &&
         pitchDelta < downThreshold
}

// Average multiple poses for stability
export function averagePoses(poses: HeadPose[]): HeadPose {
  if (poses.length === 0) {
    return { yaw: 0, pitch: 0, roll: 0, confidence: 0 }
  }

  const sum = poses.reduce(
    (acc, pose) => ({
      yaw: acc.yaw + pose.yaw,
      pitch: acc.pitch + pose.pitch,
      roll: acc.roll + pose.roll,
      confidence: acc.confidence + pose.confidence,
    }),
    { yaw: 0, pitch: 0, roll: 0, confidence: 0 }
  )

  return {
    yaw: sum.yaw / poses.length,
    pitch: sum.pitch / poses.length,
    roll: sum.roll / poses.length,
    confidence: sum.confidence / poses.length,
  }
}

// Calculate standard deviation of poses (for stability check)
export function calculatePoseStdDev(poses: HeadPose[]): number {
  if (poses.length < 2) return 0

  const avg = averagePoses(poses)
  const variance = poses.reduce((acc, pose) => {
    return acc +
      Math.pow(pose.yaw - avg.yaw, 2) +
      Math.pow(pose.pitch - avg.pitch, 2)
  }, 0) / poses.length

  return Math.sqrt(variance)
}

// Calculate calibration thresholds from reference poses
export function calculateThresholds(
  neutral: HeadPose,
  left: HeadPose,
  right: HeadPose,
  down: HeadPose
): CalibrationData['thresholds'] {
  const multiplier = HEAD_TRACKING_CONFIG.THRESHOLD_MULTIPLIER

  return {
    // Left is negative yaw from neutral
    leftYawDelta: Math.abs(neutral.yaw - left.yaw) * multiplier,
    // Right is positive yaw from neutral
    rightYawDelta: Math.abs(right.yaw - neutral.yaw) * multiplier,
    // Down is negative pitch from neutral
    downPitchDelta: Math.abs(neutral.pitch - down.pitch) * multiplier,
  }
}
