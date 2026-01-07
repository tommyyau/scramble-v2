import { useState, useCallback, useRef, useEffect } from 'react'
import type { HeadTrackingStatus, HeadPose, TiltDirection } from '../lib/headtracking/types'

// Types for MediaPipe (loaded dynamically to avoid bundling issues)
type FaceMeshType = {
  new (config: { locateFile: (file: string) => string }): FaceMeshInstance
}
type FaceMeshInstance = {
  setOptions: (options: Record<string, unknown>) => void
  onResults: (callback: (results: FaceMeshResults) => void) => void
  send: (input: { image: HTMLVideoElement }) => Promise<void>
  close: () => void
}
type FaceMeshResults = {
  multiFaceLandmarks?: Array<Array<{ x: number; y: number; z: number }>>
}
type CameraType = {
  new (
    video: HTMLVideoElement,
    config: { onFrame: () => Promise<void>; width: number; height: number }
  ): CameraInstance
}
type CameraInstance = {
  start: () => Promise<void>
  stop: () => void
}
import {
  calculateHeadPose,
  isInNeutralZone,
  detectTiltDirection,
  averagePoses,
} from '../lib/headtracking/pose-calculator'
import { HEAD_TRACKING_CONFIG } from '../lib/constants'

interface UseHeadTrackingOptions {
  enabled: boolean
  onMoveLeft: () => void
  onMoveRight: () => void
  onDrop: () => void
  onDirectionDetected?: (direction: TiltDirection) => void
}

interface UseHeadTrackingReturn {
  status: HeadTrackingStatus
  error: string | null
  isCalibrated: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  startCalibration: () => Promise<void>
  recalibrate: () => void
  stop: () => void
  proceedToGame: () => void
}

// Duration to show "detected" confirmation before moving to next step (ms)
const DETECTION_CONFIRM_DELAY = 800

export function useHeadTracking({
  enabled: _enabled, // Reserved for future pause functionality
  onMoveLeft,
  onMoveRight,
  onDrop,
  onDirectionDetected,
}: UseHeadTrackingOptions): UseHeadTrackingReturn {
  const [status, setStatus] = useState<HeadTrackingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isCalibrated, setIsCalibrated] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const faceMeshRef = useRef<FaceMeshInstance | null>(null)
  const cameraRef = useRef<CameraInstance | null>(null)

  const neutralPositionRef = useRef<HeadPose | null>(null)
  const canTriggerActionRef = useRef(true)
  const lastActionTimeRef = useRef(0)
  const calibrationPosesRef = useRef<HeadPose[]>([])
  const calibrationStepRef = useRef<'neutral' | 'left' | 'right' | 'down' | 'complete'>('neutral')

  // Use ref to track status for callback (avoids stale closure)
  const statusRef = useRef<HeadTrackingStatus>(status)
  statusRef.current = status

  // Process face detection results
  // Note: Uses statusRef.current to avoid stale closure issues since this callback
  // is registered once with FaceMesh and doesn't get updated when status changes
  const onResults = useCallback(
    (results: { multiFaceLandmarks?: Array<Array<{ x: number; y: number; z: number }>> }) => {
      const currentStatus = statusRef.current

      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        if (currentStatus === 'active') {
          setStatus('face-lost')
        }
        return
      }

      const landmarks = results.multiFaceLandmarks[0]
      const pose = calculateHeadPose(landmarks)

      // Handle calibration steps
      const calibrationStep = calibrationStepRef.current

      // Step 1: Capturing neutral position
      if (currentStatus === 'calibrating-neutral') {
        calibrationPosesRef.current.push(pose)

        // After collecting enough samples, move to left verification
        if (calibrationPosesRef.current.length >= 30) {
          neutralPositionRef.current = averagePoses(calibrationPosesRef.current)
          calibrationStepRef.current = 'left'
          setStatus('calibrating-left')
        }
        return
      }

      // Step 2: Waiting for left tilt
      if (currentStatus === 'calibrating-left' && neutralPositionRef.current) {
        const direction = detectTiltDirection(pose, neutralPositionRef.current)
        if (direction === 'left') {
          setStatus('calibrating-left-detected')
          // After confirmation delay, move to right verification
          setTimeout(() => {
            calibrationStepRef.current = 'right'
            setStatus('calibrating-right')
          }, DETECTION_CONFIRM_DELAY)
        }
        return
      }

      // Step 3: Waiting for right tilt
      if (currentStatus === 'calibrating-right' && neutralPositionRef.current) {
        const direction = detectTiltDirection(pose, neutralPositionRef.current)
        if (direction === 'right') {
          setStatus('calibrating-right-detected')
          // After confirmation delay, move to down verification
          setTimeout(() => {
            calibrationStepRef.current = 'down'
            setStatus('calibrating-down')
          }, DETECTION_CONFIRM_DELAY)
        }
        return
      }

      // Step 4: Waiting for down tilt
      if (currentStatus === 'calibrating-down' && neutralPositionRef.current) {
        const direction = detectTiltDirection(pose, neutralPositionRef.current)
        if (direction === 'drop') {
          setStatus('calibrating-down-detected')
          // After confirmation delay, calibration is complete
          setTimeout(() => {
            calibrationStepRef.current = 'complete'
            setIsCalibrated(true)
            setStatus('calibration-complete')
          }, DETECTION_CONFIRM_DELAY)
        }
        return
      }

      // Skip processing during detection confirmation states
      if (
        currentStatus === 'calibrating-left-detected' ||
        currentStatus === 'calibrating-right-detected' ||
        currentStatus === 'calibrating-down-detected' ||
        currentStatus === 'calibration-complete'
      ) {
        return
      }

      // If not calibrated or not active, skip
      if (!neutralPositionRef.current || calibrationStep !== 'complete') {
        return
      }

      // Restore status if face was lost, otherwise check if active
      if (currentStatus === 'face-lost') {
        setStatus('active')
      } else if (currentStatus !== 'active') {
        return
      }

      const neutral = neutralPositionRef.current
      const now = Date.now()

      // Check if we're in neutral zone
      if (isInNeutralZone(pose, neutral)) {
        canTriggerActionRef.current = true
        return
      }

      // If we can trigger an action and cooldown has passed
      if (
        canTriggerActionRef.current &&
        now - lastActionTimeRef.current > HEAD_TRACKING_CONFIG.ACTION_COOLDOWN
      ) {
        const direction = detectTiltDirection(pose, neutral)

        if (direction) {
          // Notify about direction for visual feedback
          onDirectionDetected?.(direction)

          // Trigger the action
          if (direction === 'left') {
            onMoveLeft()
          } else if (direction === 'right') {
            onMoveRight()
          } else if (direction === 'drop') {
            onDrop()
          }

          canTriggerActionRef.current = false
          lastActionTimeRef.current = now
        }
      }
    },
    [onMoveLeft, onMoveRight, onDrop, onDirectionDetected]
  )

  // Initialize MediaPipe and camera
  const initialize = useCallback(async () => {
    if (!videoRef.current) {
      setError('Video element not available')
      setStatus('error')
      return
    }

    try {
      setStatus('requesting-camera')

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      })

      videoRef.current.srcObject = stream

      setStatus('loading-model')

      // Access MediaPipe from window globals (loaded via CDN script tags in index.html)
      // This avoids Vite/Rollup bundling issues with these pre-minified packages
      const win = window as unknown as {
        FaceMesh?: FaceMeshType
        Camera?: CameraType
      }

      if (!win.FaceMesh || !win.Camera) {
        throw new Error('MediaPipe not loaded. Check CDN script tags in index.html.')
      }

      const FaceMesh = win.FaceMesh
      const Camera = win.Camera

      // Initialize FaceMesh
      const faceMesh = new FaceMesh({
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
      faceMeshRef.current = faceMesh

      // Initialize camera utility
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current })
          }
        },
        width: 640,
        height: 480,
      })

      cameraRef.current = camera
      await camera.start()

      // Start neutral position calibration
      calibrationPosesRef.current = []
      calibrationStepRef.current = 'neutral'
      setStatus('calibrating-neutral')
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setStatus('camera-denied')
          setError('Camera permission denied')
        } else {
          setStatus('error')
          setError(err.message)
        }
      } else {
        setStatus('error')
        setError('Failed to initialize head tracking')
      }
    }
  }, [onResults])

  // Start calibration
  const startCalibration = useCallback(async () => {
    if (!cameraRef.current) {
      await initialize()
    } else {
      // Camera already initialized, just restart calibration
      calibrationPosesRef.current = []
      calibrationStepRef.current = 'neutral'
      setStatus('calibrating-neutral')
    }
  }, [initialize])

  // Proceed to game after calibration complete
  const proceedToGame = useCallback(() => {
    if (status === 'calibration-complete') {
      setStatus('active')
    }
  }, [status])

  // Recalibrate
  const recalibrate = useCallback(() => {
    setIsCalibrated(false)
    neutralPositionRef.current = null
    canTriggerActionRef.current = true
    calibrationPosesRef.current = []
    calibrationStepRef.current = 'neutral'
    setStatus('calibrating-neutral')
  }, [])

  // Stop tracking
  const stop = useCallback(() => {
    cameraRef.current?.stop()
    faceMeshRef.current?.close()

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }

    cameraRef.current = null
    faceMeshRef.current = null
    neutralPositionRef.current = null
    calibrationStepRef.current = 'neutral'
    setIsCalibrated(false)
    setStatus('idle')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    status,
    error,
    isCalibrated,
    videoRef,
    startCalibration,
    recalibrate,
    stop,
    proceedToGame,
  }
}
