import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  HandTrackingStatus,
  HandDirection,
  Landmark,
  CalibrationData,
  TriggerState,
  HandPosition,
  VerificationState,
} from '../lib/handtracking/types'
import {
  smoothLandmarks,
  getHandCentroid,
  checkNeutralZonePersonalized,
  createInitialCalibrationData,
  calculateThresholds,
  averagePositions,
  calculateMovementDelta,
} from '../lib/handtracking/position-calculator'
import { HAND_TRACKING_CONFIG } from '../lib/constants'

// Types for MediaPipe Hands (loaded dynamically to avoid bundling issues)
type HandsType = {
  new (config: { locateFile: (file: string) => string }): HandsInstance
}
type HandsInstance = {
  setOptions: (options: Record<string, unknown>) => void
  onResults: (callback: (results: HandsResults) => void) => void
  send: (input: { image: HTMLVideoElement }) => Promise<void>
  close: () => void
}
type HandsResults = {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>
  multiHandedness?: Array<{ label: 'Left' | 'Right'; score: number }>
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

interface UseHandTrackingOptions {
  enabled: boolean
  onMoveLeft: () => void
  onMoveRight: () => void
  onDrop: () => void
  onDirectionDetected?: (direction: HandDirection) => void
}

interface UseHandTrackingReturn {
  status: HandTrackingStatus
  error: string | null
  isCalibrated: boolean
  videoRef: React.RefObject<HTMLVideoElement | null>
  landmarks: Landmark[] | null
  detectedDirection: HandDirection
  triggerState: TriggerState
  calibrationProgress: number
  calibrationData: CalibrationData | null
  currentHandPosition: HandPosition | null
  countdownSeconds: number
  verificationState: VerificationState
  startCalibration: () => Promise<void>
  recalibrate: () => void
  commitCalibration: () => void
  stop: () => void
}

// Calculate FPS-based sample count
const FPS = HAND_TRACKING_CONFIG.DETECTION_FPS
const CENTER_SAMPLES = HAND_TRACKING_CONFIG.CENTER_CALIBRATION_SAMPLES
const MOVEMENT_SAMPLES = HAND_TRACKING_CONFIG.MOVEMENT_CALIBRATION_SAMPLES
const COUNTDOWN_FRAMES = HAND_TRACKING_CONFIG.COUNTDOWN_SECONDS * FPS
const RETURN_FRAMES = HAND_TRACKING_CONFIG.RETURN_SECONDS * FPS

export function useHandTracking({
  enabled: _enabled,
  onMoveLeft,
  onMoveRight,
  onDrop,
  onDirectionDetected,
}: UseHandTrackingOptions): UseHandTrackingReturn {
  const [status, setStatus] = useState<HandTrackingStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isCalibrated, setIsCalibrated] = useState(false)
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null)
  const [detectedDirection, setDetectedDirection] = useState<HandDirection>(null)
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const [triggerState, setTriggerState] = useState<TriggerState>('neutral')
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null)
  const [currentHandPosition, setCurrentHandPosition] = useState<HandPosition | null>(null)
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [verificationState, setVerificationState] = useState<VerificationState>({
    leftTested: false,
    rightTested: false,
    downTested: false,
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const handsRef = useRef<HandsInstance | null>(null)
  const cameraRef = useRef<CameraInstance | null>(null)

  // Use refs for values that change frequently to avoid re-renders
  const smoothedLandmarksRef = useRef<Landmark[] | null>(null)
  const frameCountRef = useRef(0)
  const triggerStateRef = useRef<TriggerState>('neutral')

  // Calibration data refs
  const calibrationDataRef = useRef<CalibrationData | null>(null)
  const centerPositionsRef = useRef<HandPosition[]>([])
  const phaseFrameCountRef = useRef(0)
  const maxMovementsRef = useRef({ left: 0, right: 0, down: 0 })

  // Use ref to track status for callback (avoids stale closure)
  const statusRef = useRef<HandTrackingStatus>(status)
  statusRef.current = status

  // Verification state ref
  const verificationStateRef = useRef<VerificationState>({
    leftTested: false,
    rightTested: false,
    downTested: false,
  })

  // Helper to transition to next calibration phase
  const transitionToPhase = useCallback((newStatus: HandTrackingStatus) => {
    phaseFrameCountRef.current = 0
    statusRef.current = newStatus
    setStatus(newStatus)
    setCalibrationProgress(0)

    // Set countdown for countdown phases
    if (newStatus.startsWith('countdown-')) {
      setCountdownSeconds(HAND_TRACKING_CONFIG.COUNTDOWN_SECONDS)
    } else if (newStatus.startsWith('return-')) {
      setCountdownSeconds(HAND_TRACKING_CONFIG.RETURN_SECONDS)
    } else {
      setCountdownSeconds(0)
    }
  }, [])

  // Process hand detection results
  const onResults = useCallback(
    (results: HandsResults) => {
      const currentStatus = statusRef.current
      frameCountRef.current++
      phaseFrameCountRef.current++

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        if (currentStatus === 'active') {
          setStatus('hand-lost')
        }
        setLandmarks(null)
        setDetectedDirection(null)
        setCurrentHandPosition(null)
        return
      }

      // Get raw landmarks and apply smoothing
      const rawLandmarks = results.multiHandLandmarks[0] as Landmark[]
      const smoothed = smoothLandmarks(rawLandmarks, smoothedLandmarksRef.current, HAND_TRACKING_CONFIG.SMOOTHING_ALPHA)
      smoothedLandmarksRef.current = smoothed

      // Get current hand position
      const handPosition = getHandCentroid(smoothed)

      // Only update state every few frames to reduce flickering
      if (frameCountRef.current % 2 === 0) {
        setLandmarks(smoothed)
        setCurrentHandPosition(handPosition)
      }

      // ============ CALIBRATION STATE MACHINE ============

      // Phase 1: Center calibration
      if (currentStatus === 'calibrating-center') {
        centerPositionsRef.current.push(handPosition)
        const progress = centerPositionsRef.current.length / CENTER_SAMPLES
        setCalibrationProgress(Math.min(progress, 1))

        if (centerPositionsRef.current.length >= CENTER_SAMPLES) {
          // Average the positions and create initial calibration data
          const centerPos = averagePositions(centerPositionsRef.current)
          const initialData = createInitialCalibrationData(centerPos)
          calibrationDataRef.current = initialData
          setCalibrationData(initialData)

          // Transition to countdown for left
          transitionToPhase('countdown-left')
        }
        return
      }

      // Phase 2: Countdown before left capture
      if (currentStatus === 'countdown-left') {
        const progress = phaseFrameCountRef.current / COUNTDOWN_FRAMES
        setCalibrationProgress(Math.min(progress, 1))

        // Update countdown display
        const remaining = Math.ceil(HAND_TRACKING_CONFIG.COUNTDOWN_SECONDS - (phaseFrameCountRef.current / FPS))
        setCountdownSeconds(Math.max(remaining, 0))

        if (phaseFrameCountRef.current >= COUNTDOWN_FRAMES) {
          transitionToPhase('calibrating-left')
        }
        return
      }

      // Phase 3: Capture left movement
      if (currentStatus === 'calibrating-left') {
        const progress = phaseFrameCountRef.current / MOVEMENT_SAMPLES
        setCalibrationProgress(Math.min(progress, 1))

        // Track maximum left movement
        if (calibrationDataRef.current) {
          const { dx } = calculateMovementDelta(handPosition, calibrationDataRef.current.centerPosition)
          // dx < 0 means left movement (in mirrored view)
          if (dx < 0 && Math.abs(dx) > maxMovementsRef.current.left) {
            maxMovementsRef.current.left = Math.abs(dx)
          }
        }

        if (phaseFrameCountRef.current >= MOVEMENT_SAMPLES) {
          transitionToPhase('return-for-right')
        }
        return
      }

      // Phase 4: Return to center before right
      if (currentStatus === 'return-for-right') {
        const progress = phaseFrameCountRef.current / RETURN_FRAMES
        setCalibrationProgress(Math.min(progress, 1))

        const remaining = Math.ceil(HAND_TRACKING_CONFIG.RETURN_SECONDS - (phaseFrameCountRef.current / FPS))
        setCountdownSeconds(Math.max(remaining, 0))

        if (phaseFrameCountRef.current >= RETURN_FRAMES) {
          transitionToPhase('countdown-right')
        }
        return
      }

      // Phase 5: Countdown before right capture
      if (currentStatus === 'countdown-right') {
        const progress = phaseFrameCountRef.current / COUNTDOWN_FRAMES
        setCalibrationProgress(Math.min(progress, 1))

        const remaining = Math.ceil(HAND_TRACKING_CONFIG.COUNTDOWN_SECONDS - (phaseFrameCountRef.current / FPS))
        setCountdownSeconds(Math.max(remaining, 0))

        if (phaseFrameCountRef.current >= COUNTDOWN_FRAMES) {
          transitionToPhase('calibrating-right')
        }
        return
      }

      // Phase 6: Capture right movement
      if (currentStatus === 'calibrating-right') {
        const progress = phaseFrameCountRef.current / MOVEMENT_SAMPLES
        setCalibrationProgress(Math.min(progress, 1))

        if (calibrationDataRef.current) {
          const { dx } = calculateMovementDelta(handPosition, calibrationDataRef.current.centerPosition)
          // dx > 0 means right movement (in mirrored view)
          if (dx > 0 && dx > maxMovementsRef.current.right) {
            maxMovementsRef.current.right = dx
          }
        }

        if (phaseFrameCountRef.current >= MOVEMENT_SAMPLES) {
          transitionToPhase('return-for-down')
        }
        return
      }

      // Phase 7: Return to center before down
      if (currentStatus === 'return-for-down') {
        const progress = phaseFrameCountRef.current / RETURN_FRAMES
        setCalibrationProgress(Math.min(progress, 1))

        const remaining = Math.ceil(HAND_TRACKING_CONFIG.RETURN_SECONDS - (phaseFrameCountRef.current / FPS))
        setCountdownSeconds(Math.max(remaining, 0))

        if (phaseFrameCountRef.current >= RETURN_FRAMES) {
          transitionToPhase('countdown-down')
        }
        return
      }

      // Phase 8: Countdown before down capture
      if (currentStatus === 'countdown-down') {
        const progress = phaseFrameCountRef.current / COUNTDOWN_FRAMES
        setCalibrationProgress(Math.min(progress, 1))

        const remaining = Math.ceil(HAND_TRACKING_CONFIG.COUNTDOWN_SECONDS - (phaseFrameCountRef.current / FPS))
        setCountdownSeconds(Math.max(remaining, 0))

        if (phaseFrameCountRef.current >= COUNTDOWN_FRAMES) {
          transitionToPhase('calibrating-down')
        }
        return
      }

      // Phase 9: Capture down movement
      if (currentStatus === 'calibrating-down') {
        const progress = phaseFrameCountRef.current / MOVEMENT_SAMPLES
        setCalibrationProgress(Math.min(progress, 1))

        if (calibrationDataRef.current) {
          const { dy } = calculateMovementDelta(handPosition, calibrationDataRef.current.centerPosition)
          // dy > 0 means down movement
          if (dy > 0 && dy > maxMovementsRef.current.down) {
            maxMovementsRef.current.down = dy
          }
        }

        if (phaseFrameCountRef.current >= MOVEMENT_SAMPLES) {
          // Calculate final thresholds from max movements
          const thresholds = calculateThresholds(maxMovementsRef.current)

          // Update calibration data with final values
          if (calibrationDataRef.current) {
            calibrationDataRef.current = {
              ...calibrationDataRef.current,
              thresholds,
              maxMovements: { ...maxMovementsRef.current },
            }
            setCalibrationData(calibrationDataRef.current)
          }

          // Reset verification state
          verificationStateRef.current = {
            leftTested: false,
            rightTested: false,
            downTested: false,
          }
          setVerificationState(verificationStateRef.current)

          transitionToPhase('verification')
        }
        return
      }

      // Phase 10: Verification - let user test movements
      if (currentStatus === 'verification') {
        if (!calibrationDataRef.current) return

        const zoneCheck = checkNeutralZonePersonalized(handPosition, calibrationDataRef.current)

        // Show direction feedback
        setDetectedDirection(zoneCheck.direction)

        // Track which directions have been tested
        if (zoneCheck.direction === 'left' && !verificationStateRef.current.leftTested) {
          verificationStateRef.current = { ...verificationStateRef.current, leftTested: true }
          setVerificationState(verificationStateRef.current)
        } else if (zoneCheck.direction === 'right' && !verificationStateRef.current.rightTested) {
          verificationStateRef.current = { ...verificationStateRef.current, rightTested: true }
          setVerificationState(verificationStateRef.current)
        } else if (zoneCheck.direction === 'drop' && !verificationStateRef.current.downTested) {
          verificationStateRef.current = { ...verificationStateRef.current, downTested: true }
          setVerificationState(verificationStateRef.current)
        }

        // Update trigger state for visual feedback
        if (zoneCheck.isInNeutralZone) {
          if (triggerStateRef.current !== 'neutral') {
            triggerStateRef.current = 'neutral'
            setTriggerState('neutral')
          }
        } else if (zoneCheck.direction) {
          const newState = `triggered_${zoneCheck.direction === 'drop' ? 'drop' : zoneCheck.direction}` as TriggerState
          if (triggerStateRef.current !== newState) {
            triggerStateRef.current = newState
            setTriggerState(newState)
          }
        }
        return
      }

      // ============ GAMEPLAY ============

      // If not calibrated, skip
      if (!calibrationDataRef.current) {
        return
      }

      // Restore status if hand was lost
      if (currentStatus === 'hand-lost') {
        setStatus('active')
      } else if (currentStatus !== 'active') {
        return
      }

      // Position-based detection with personalized thresholds
      const zoneCheck = checkNeutralZonePersonalized(handPosition, calibrationDataRef.current)

      const currentTriggerState = triggerStateRef.current

      // State machine logic
      // Reset to neutral if:
      // 1. Hand is inside the neutral zone, OR
      // 2. Hand is outside but no clear direction (ambiguous position)
      const direction = zoneCheck.direction

      if (zoneCheck.isInNeutralZone || direction === null) {
        // Hand returned to neutral or is in ambiguous position - reset trigger state
        if (currentTriggerState !== 'neutral') {
          triggerStateRef.current = 'neutral'
          setTriggerState('neutral')
          setDetectedDirection(null)
        }
      } else {
        // Hand is outside neutral zone with a clear direction

        // Only fire action if we were in neutral state (return-to-center requirement)
        // No cooldown needed - state machine prevents double-fires
        if (currentTriggerState === 'neutral') {
          // Fire the action ONCE
          if (direction === 'left') {
            console.log('[HandTracking] Position-based LEFT action')
            onMoveLeft()
            triggerStateRef.current = 'triggered_left'
            setTriggerState('triggered_left')
          } else if (direction === 'right') {
            console.log('[HandTracking] Position-based RIGHT action')
            onMoveRight()
            triggerStateRef.current = 'triggered_right'
            setTriggerState('triggered_right')
          } else if (direction === 'drop') {
            console.log('[HandTracking] Position-based DROP action')
            onDrop()
            triggerStateRef.current = 'triggered_drop'
            setTriggerState('triggered_drop')
          }

          // Visual feedback
          setDetectedDirection(direction)
          onDirectionDetected?.(direction)
        }
      }
    },
    [onMoveLeft, onMoveRight, onDrop, onDirectionDetected, transitionToPhase]
  )

  // Initialize MediaPipe Hands and camera
  const initialize = useCallback(async () => {
    if (!videoRef.current) {
      setError('Video element not available')
      setStatus('error')
      return
    }

    try {
      setStatus('requesting-camera')

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      })

      videoRef.current.srcObject = stream
      setStatus('loading-model')

      const win = window as unknown as {
        Hands?: HandsType
        Camera?: CameraType
      }

      if (!win.Hands || !win.Camera) {
        throw new Error('MediaPipe Hands not loaded. Check CDN script tags in index.html.')
      }

      const Hands = win.Hands
      const Camera = win.Camera

      const hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        },
      })

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6,
      })

      hands.onResults(onResults)
      handsRef.current = hands

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current })
          }
        },
        width: 640,
        height: 480,
      })

      cameraRef.current = camera
      await camera.start()

      // Start center calibration
      centerPositionsRef.current = []
      maxMovementsRef.current = { left: 0, right: 0, down: 0 }
      phaseFrameCountRef.current = 0
      setCalibrationProgress(0)
      transitionToPhase('calibrating-center')
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
        setError('Failed to initialize hand tracking')
      }
    }
  }, [onResults, transitionToPhase])

  const startCalibration = useCallback(async () => {
    if (!cameraRef.current) {
      await initialize()
    } else {
      // Reset calibration
      centerPositionsRef.current = []
      maxMovementsRef.current = { left: 0, right: 0, down: 0 }
      calibrationDataRef.current = null
      setCalibrationData(null)
      phaseFrameCountRef.current = 0
      setCalibrationProgress(0)
      transitionToPhase('calibrating-center')
    }
  }, [initialize, transitionToPhase])

  const recalibrate = useCallback(() => {
    setIsCalibrated(false)
    centerPositionsRef.current = []
    maxMovementsRef.current = { left: 0, right: 0, down: 0 }
    calibrationDataRef.current = null
    setCalibrationData(null)
    triggerStateRef.current = 'neutral'
    setTriggerState('neutral')
    phaseFrameCountRef.current = 0
    setCalibrationProgress(0)
    setDetectedDirection(null)
    setCurrentHandPosition(null)
    setCountdownSeconds(0)
    verificationStateRef.current = {
      leftTested: false,
      rightTested: false,
      downTested: false,
    }
    setVerificationState(verificationStateRef.current)
    transitionToPhase('calibrating-center')
  }, [transitionToPhase])

  // User commits calibration after verification
  const commitCalibration = useCallback(() => {
    if (statusRef.current !== 'verification') return

    setIsCalibrated(true)
    triggerStateRef.current = 'neutral'
    setTriggerState('neutral')
    setDetectedDirection(null)
    statusRef.current = 'active'
    setStatus('active')
  }, [])

  const stop = useCallback(() => {
    cameraRef.current?.stop()
    handsRef.current?.close()

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }

    cameraRef.current = null
    handsRef.current = null
    calibrationDataRef.current = null
    smoothedLandmarksRef.current = null
    triggerStateRef.current = 'neutral'
    centerPositionsRef.current = []
    maxMovementsRef.current = { left: 0, right: 0, down: 0 }
    phaseFrameCountRef.current = 0
    setIsCalibrated(false)
    setLandmarks(null)
    setDetectedDirection(null)
    setCalibrationProgress(0)
    setTriggerState('neutral')
    setCalibrationData(null)
    setCurrentHandPosition(null)
    setCountdownSeconds(0)
    verificationStateRef.current = {
      leftTested: false,
      rightTested: false,
      downTested: false,
    }
    setVerificationState(verificationStateRef.current)
    setStatus('idle')
  }, [])

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
    landmarks,
    detectedDirection,
    triggerState,
    calibrationProgress,
    calibrationData,
    currentHandPosition,
    countdownSeconds,
    verificationState,
    startCalibration,
    recalibrate,
    commitCalibration,
    stop,
  }
}
