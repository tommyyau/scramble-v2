import { useState, useCallback, useEffect, useRef } from 'react'
import {
  HeadPose,
  HeadGesture,
  CalibrationData,
  HEAD_TRACKING_CONFIG,
} from '../lib/head-tracking/types'
import {
  createFaceMesh,
  createCamera,
  calculateHeadPose,
  detectGesture,
  isInNeutralZone,
} from '../lib/head-tracking/pose-detection'

// Types for MediaPipe instances (loaded from CDN)
type FaceMeshInstance = {
  close: () => void
}
type CameraInstance = {
  start: () => Promise<void>
  stop: () => void
}
type Results = {
  multiFaceLandmarks?: Array<Array<{ x: number; y: number; z: number }>>
}

interface UseHeadTrackingOptions {
  enabled: boolean
  calibrationData: CalibrationData | null
  onMoveLeft?: () => void
  onMoveRight?: () => void
  onDrop?: () => void
  onGestureChange?: (gesture: HeadGesture) => void
}

interface UseHeadTrackingReturn {
  isTracking: boolean
  currentGesture: HeadGesture
  currentPose: HeadPose | null
  error: string | null
  videoRef: React.RefObject<HTMLVideoElement>
  startTracking: () => Promise<void>
  stopTracking: () => void
}

export function useHeadTracking({
  enabled,
  calibrationData,
  onMoveLeft,
  onMoveRight,
  onDrop,
  onGestureChange,
}: UseHeadTrackingOptions): UseHeadTrackingReturn {
  const [isTracking, setIsTracking] = useState(false)
  const [currentGesture, setCurrentGesture] = useState<HeadGesture>(null)
  const [currentPose, setCurrentPose] = useState<HeadPose | null>(null)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const faceMeshRef = useRef<FaceMeshInstance | null>(null)
  const cameraRef = useRef<CameraInstance | null>(null)
  const lastGestureRef = useRef<HeadGesture>(null)
  const lastActionTimeRef = useRef<number>(0)
  const wasInNeutralRef = useRef<boolean>(true)

  // Use refs for callbacks to avoid stale closure issues
  const calibrationDataRef = useRef<CalibrationData | null>(calibrationData)
  const onMoveLeftRef = useRef(onMoveLeft)
  const onMoveRightRef = useRef(onMoveRight)
  const onDropRef = useRef(onDrop)
  const onGestureChangeRef = useRef(onGestureChange)

  // Keep refs in sync with props
  useEffect(() => {
    calibrationDataRef.current = calibrationData
  }, [calibrationData])

  useEffect(() => {
    onMoveLeftRef.current = onMoveLeft
    onMoveRightRef.current = onMoveRight
    onDropRef.current = onDrop
    onGestureChangeRef.current = onGestureChange
  }, [onMoveLeft, onMoveRight, onDrop, onGestureChange])

  // Handle pose detection results - uses refs to avoid stale closures
  const handleResults = useCallback((results: Results) => {
    const calibration = calibrationDataRef.current
    if (!calibration || !results.multiFaceLandmarks?.[0]) {
      setCurrentPose(null)
      setCurrentGesture(null)
      return
    }

    const landmarks = results.multiFaceLandmarks[0]
    const pose = calculateHeadPose(landmarks)
    setCurrentPose(pose)

    // Skip low confidence detections
    if (pose.confidence < HEAD_TRACKING_CONFIG.CONFIDENCE_THRESHOLD) {
      return
    }

    // Detect current gesture
    let gesture = detectGesture(pose, calibration)
    const inNeutral = isInNeutralZone(pose, calibration)
    const now = Date.now()

    // IMPORTANT: Swap left/right because selfie camera is mirrored
    // When user turns head left (their perspective), camera sees right
    if (gesture === 'left') {
      gesture = 'right'
    } else if (gesture === 'right') {
      gesture = 'left'
    }

    // State machine: trigger action on gesture change
    if (gesture !== lastGestureRef.current) {
      setCurrentGesture(gesture)
      onGestureChangeRef.current?.(gesture)

      // Trigger action when gesture changes to a direction (with debounce)
      if (
        gesture !== 'neutral' &&
        gesture !== null &&
        now - lastActionTimeRef.current > HEAD_TRACKING_CONFIG.ACTION_DEBOUNCE
      ) {
        lastActionTimeRef.current = now

        switch (gesture) {
          case 'left':
            console.log('Head tracking: moving left')
            onMoveLeftRef.current?.()
            break
          case 'right':
            console.log('Head tracking: moving right')
            onMoveRightRef.current?.()
            break
          case 'down':
            console.log('Head tracking: dropping')
            onDropRef.current?.()
            break
        }
      }

      lastGestureRef.current = gesture
    }

    // Track neutral zone for hysteresis (for future use)
    wasInNeutralRef.current = inNeutral
  }, []) // No dependencies - uses refs

  // Start tracking
  const startTracking = useCallback(async () => {
    if (!videoRef.current) {
      setError('Video element not available')
      return
    }

    try {
      setError(null)

      // Initialize FaceMesh
      const faceMesh = createFaceMesh(handleResults)
      faceMeshRef.current = faceMesh

      // Initialize camera
      const camera = createCamera(
        videoRef.current,
        faceMesh,
        HEAD_TRACKING_CONFIG.DETECTION_FPS
      )
      cameraRef.current = camera

      await camera.start()
      setIsTracking(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start tracking'
      setError(message)
      setIsTracking(false)
    }
  }, [handleResults])

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop()
      cameraRef.current = null
    }

    if (faceMeshRef.current) {
      faceMeshRef.current.close()
      faceMeshRef.current = null
    }

    setIsTracking(false)
    setCurrentGesture(null)
    setCurrentPose(null)
  }, [])

  // Auto-start/stop based on enabled state
  useEffect(() => {
    if (enabled && calibrationData && !isTracking) {
      startTracking()
    } else if (!enabled && isTracking) {
      stopTracking()
    }
  }, [enabled, calibrationData, isTracking, startTracking, stopTracking])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  return {
    isTracking,
    currentGesture,
    currentPose,
    error,
    videoRef,
    startTracking,
    stopTracking,
  }
}
