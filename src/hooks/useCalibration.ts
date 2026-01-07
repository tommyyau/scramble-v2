import { useState, useCallback, useRef, useEffect } from 'react'
import {
  HeadPose,
  CalibrationData,
  CalibrationStep,
  HEAD_TRACKING_CONFIG,
} from '../lib/head-tracking/types'
import {
  createFaceMesh,
  createCamera,
  calculateHeadPose,
  averagePoses,
  calculatePoseStdDev,
  calculateThresholds,
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
import {
  saveCalibration,
  loadCalibration,
} from '../lib/head-tracking/calibration-storage'

interface UseCalibrationOptions {
  onComplete?: (data: CalibrationData) => void
  onCancel?: () => void
}

interface UseCalibrationReturn {
  step: CalibrationStep
  progress: number
  error: string | null
  calibrationData: CalibrationData | null
  isCapturing: boolean
  videoRef: React.RefObject<HTMLVideoElement>
  startCalibration: () => Promise<void>
  captureCurrentStep: () => void
  retryStep: () => void
  cancelCalibration: () => void
  loadExistingCalibration: () => CalibrationData | null
}

const STEP_ORDER: CalibrationStep[] = ['neutral', 'left', 'right', 'down', 'complete']

export function useCalibration({
  onComplete,
  onCancel,
}: UseCalibrationOptions = {}): UseCalibrationReturn {
  const [step, setStep] = useState<CalibrationStep>('requesting-camera')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const faceMeshRef = useRef<FaceMeshInstance | null>(null)
  const cameraRef = useRef<CameraInstance | null>(null)
  const poseSamplesRef = useRef<HeadPose[]>([])
  const capturedPosesRef = useRef<{
    neutral?: HeadPose
    left?: HeadPose
    right?: HeadPose
    down?: HeadPose
  }>({})
  const captureIntervalRef = useRef<number | null>(null)
  const currentPoseRef = useRef<HeadPose | null>(null)

  // Handle pose detection results during calibration
  const handleResults = useCallback((results: Results) => {
    if (!results.multiFaceLandmarks?.[0]) {
      currentPoseRef.current = null
      return
    }

    const landmarks = results.multiFaceLandmarks[0]
    const pose = calculateHeadPose(landmarks)
    currentPoseRef.current = pose
  }, [])

  // Start calibration process
  const startCalibration = useCallback(async () => {
    if (!videoRef.current) {
      setError('Video element not available')
      return
    }

    try {
      setError(null)
      setStep('requesting-camera')
      capturedPosesRef.current = {}

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
      setStep('neutral')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera'
      setError(message)
    }
  }, [handleResults])

  // Capture pose samples for current step
  const captureCurrentStep = useCallback(() => {
    if (isCapturing || step === 'requesting-camera' || step === 'complete') {
      return
    }

    setIsCapturing(true)
    setProgress(0)
    poseSamplesRef.current = []
    setError(null)

    const sampleDuration = HEAD_TRACKING_CONFIG.SAMPLE_DURATION
    const sampleInterval = 50 // Sample every 50ms
    const totalSamples = sampleDuration / sampleInterval
    let sampleCount = 0

    captureIntervalRef.current = window.setInterval(() => {
      const pose = currentPoseRef.current

      if (pose && pose.confidence >= HEAD_TRACKING_CONFIG.CONFIDENCE_THRESHOLD) {
        poseSamplesRef.current.push(pose)
      }

      sampleCount++
      setProgress(Math.round((sampleCount / totalSamples) * 100))

      if (sampleCount >= totalSamples) {
        // Sampling complete
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current)
          captureIntervalRef.current = null
        }

        const samples = poseSamplesRef.current

        // Check if we got enough samples
        if (samples.length < totalSamples * 0.5) {
          setError('Face not detected consistently. Please try again.')
          setIsCapturing(false)
          setProgress(0)
          return
        }

        // Check stability
        const stdDev = calculatePoseStdDev(samples)
        if (stdDev > HEAD_TRACKING_CONFIG.STABILITY_THRESHOLD) {
          setError('Head movement detected. Please hold still and try again.')
          setIsCapturing(false)
          setProgress(0)
          return
        }

        // Average the samples
        const averagedPose = averagePoses(samples)
        capturedPosesRef.current[step as 'neutral' | 'left' | 'right' | 'down'] = averagedPose

        // Move to next step
        const currentIndex = STEP_ORDER.indexOf(step)
        const nextStep = STEP_ORDER[currentIndex + 1]
        setStep(nextStep)
        setIsCapturing(false)
        setProgress(0)

        // If calibration complete, finalize
        if (nextStep === 'complete') {
          const { neutral, left, right, down } = capturedPosesRef.current

          if (neutral && left && right && down) {
            const thresholds = calculateThresholds(neutral, left, right, down)
            const data: CalibrationData = {
              neutral,
              left,
              right,
              down,
              thresholds,
              timestamp: Date.now(),
            }

            setCalibrationData(data)
            saveCalibration(data)
            onComplete?.(data)

            // Stop camera after calibration
            if (cameraRef.current) {
              cameraRef.current.stop()
              cameraRef.current = null
            }
            if (faceMeshRef.current) {
              faceMeshRef.current.close()
              faceMeshRef.current = null
            }
          }
        }
      }
    }, sampleInterval)
  }, [isCapturing, step, onComplete])

  // Retry current step
  const retryStep = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
      captureIntervalRef.current = null
    }
    setIsCapturing(false)
    setProgress(0)
    setError(null)
    poseSamplesRef.current = []
  }, [])

  // Cancel calibration
  const cancelCalibration = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
      captureIntervalRef.current = null
    }

    if (cameraRef.current) {
      cameraRef.current.stop()
      cameraRef.current = null
    }

    if (faceMeshRef.current) {
      faceMeshRef.current.close()
      faceMeshRef.current = null
    }

    setStep('requesting-camera')
    setIsCapturing(false)
    setProgress(0)
    setError(null)
    capturedPosesRef.current = {}

    onCancel?.()
  }, [onCancel])

  // Load existing calibration
  const loadExistingCalibration = useCallback((): CalibrationData | null => {
    const data = loadCalibration()
    if (data) {
      setCalibrationData(data)
    }
    return data
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current)
      }
      if (cameraRef.current) {
        cameraRef.current.stop()
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close()
      }
    }
  }, [])

  return {
    step,
    progress,
    error,
    calibrationData,
    isCapturing,
    videoRef,
    startCalibration,
    captureCurrentStep,
    retryStep,
    cancelCalibration,
    loadExistingCalibration,
  }
}
