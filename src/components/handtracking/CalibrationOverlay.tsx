import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { HandTrackingStatus, Landmark, CalibrationData, VerificationState, HandPosition } from '../../lib/handtracking/types'
import { drawHandMesh, drawStatusIndicator } from '../../lib/handtracking/mesh-renderer'
import { Hand, ArrowLeft, ArrowRight, ArrowDown, Check, Circle } from 'lucide-react'

interface CalibrationOverlayProps {
  status: HandTrackingStatus
  error: string | null
  videoRef: RefObject<HTMLVideoElement | null>
  landmarks?: Landmark[] | null
  calibrationProgress: number // 0-1
  countdownSeconds: number
  verificationState: VerificationState
  calibrationData: CalibrationData | null
  currentHandPosition: HandPosition | null
  onStartCalibration: () => void
  onCommit: () => void
  onCancel: () => void
}

// Helper to check if in a calibration phase
function isCalibrationPhase(status: HandTrackingStatus): boolean {
  return (
    status === 'calibrating-center' ||
    status === 'countdown-left' ||
    status === 'calibrating-left' ||
    status === 'return-for-right' ||
    status === 'countdown-right' ||
    status === 'calibrating-right' ||
    status === 'return-for-down' ||
    status === 'countdown-down' ||
    status === 'calibrating-down' ||
    status === 'verification'
  )
}

// Get phase display info
function getPhaseInfo(status: HandTrackingStatus): {
  title: string
  instruction: string
  showArrow?: 'left' | 'right' | 'down'
  isCountdown?: boolean
  isReturn?: boolean
} {
  switch (status) {
    case 'calibrating-center':
      return {
        title: 'Center Calibration',
        instruction: 'Hold your hand steady in the center',
      }
    case 'countdown-left':
      return {
        title: 'Get Ready',
        instruction: 'Move LEFT when countdown ends',
        showArrow: 'left',
        isCountdown: true,
      }
    case 'calibrating-left':
      return {
        title: 'Move LEFT',
        instruction: 'Show your comfortable left movement range',
        showArrow: 'left',
      }
    case 'return-for-right':
      return {
        title: 'Return to Center',
        instruction: 'Bring your hand back to center',
        isReturn: true,
      }
    case 'countdown-right':
      return {
        title: 'Get Ready',
        instruction: 'Move RIGHT when countdown ends',
        showArrow: 'right',
        isCountdown: true,
      }
    case 'calibrating-right':
      return {
        title: 'Move RIGHT',
        instruction: 'Show your comfortable right movement range',
        showArrow: 'right',
      }
    case 'return-for-down':
      return {
        title: 'Return to Center',
        instruction: 'Bring your hand back to center',
        isReturn: true,
      }
    case 'countdown-down':
      return {
        title: 'Get Ready',
        instruction: 'Move DOWN when countdown ends',
        showArrow: 'down',
        isCountdown: true,
      }
    case 'calibrating-down':
      return {
        title: 'Move DOWN',
        instruction: 'Show your comfortable down movement range',
        showArrow: 'down',
      }
    case 'verification':
      return {
        title: 'Test Your Controls',
        instruction: 'Test each movement, then press Start Game',
      }
    default:
      return { title: '', instruction: '' }
  }
}

// Get phase step number for progress indicator
function getPhaseStep(status: HandTrackingStatus): number {
  const phaseOrder: HandTrackingStatus[] = [
    'calibrating-center',
    'countdown-left',
    'calibrating-left',
    'return-for-right',
    'countdown-right',
    'calibrating-right',
    'return-for-down',
    'countdown-down',
    'calibrating-down',
    'verification',
  ]
  const index = phaseOrder.indexOf(status)
  return index >= 0 ? index + 1 : 0
}

export function CalibrationOverlay({
  status,
  error,
  videoRef,
  landmarks,
  calibrationProgress,
  countdownSeconds,
  verificationState,
  calibrationData,
  currentHandPosition,
  onStartCalibration,
  onCommit,
  onCancel,
}: CalibrationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)

  // Video preview dimensions
  const videoWidth = 320
  const videoHeight = 240

  // Mirror the stream to the preview video
  useEffect(() => {
    if (previewVideoRef.current && videoRef.current?.srcObject) {
      previewVideoRef.current.srcObject = videoRef.current.srcObject
    }
  }, [videoRef, status])

  // Draw hand mesh and calibration overlays on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, videoWidth, videoHeight)

    // Draw landmarks if available
    if (landmarks && landmarks.length >= 21) {
      drawHandMesh(ctx, landmarks, videoWidth, videoHeight, {
        landmarkRadius: 4,
        connectionWidth: 2,
      }, null)

      drawStatusIndicator(ctx, videoWidth, videoHeight, 'detected')
    }

    // Draw asymmetric trigger zone during verification (shows actual thresholds)
    if (status === 'verification' && calibrationData) {
      const { centerPosition, thresholds } = calibrationData
      const cx = centerPosition.x * videoWidth
      const cy = centerPosition.y * videoHeight

      // Convert thresholds to pixels
      const leftPx = thresholds.left * videoWidth
      const rightPx = thresholds.right * videoWidth
      const downPx = thresholds.down * videoHeight
      const topPx = downPx * 0.4

      // Draw asymmetric zone shape
      ctx.beginPath()
      ctx.moveTo(cx - leftPx, cy - topPx)
      ctx.lineTo(cx - leftPx, cy + downPx)
      ctx.lineTo(cx + rightPx, cy + downPx)
      ctx.lineTo(cx + rightPx, cy - topPx)
      ctx.closePath()
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)'
      ctx.fillStyle = 'rgba(34, 197, 94, 0.12)'
      ctx.lineWidth = 2
      ctx.fill()
      ctx.stroke()

      // Draw crosshair at center
      ctx.beginPath()
      ctx.moveTo(cx - 8, cy)
      ctx.lineTo(cx + 8, cy)
      ctx.moveTo(cx, cy - 8)
      ctx.lineTo(cx, cy + 8)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Draw hand position indicator during verification
    if (status === 'verification' && currentHandPosition && calibrationData) {
      const hx = currentHandPosition.x * videoWidth
      const hy = currentHandPosition.y * videoHeight
      const cx = calibrationData.centerPosition.x * videoWidth
      const cy = calibrationData.centerPosition.y * videoHeight

      // Draw line from center to hand
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(hx, hy)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      // Draw hand position dot
      ctx.beginPath()
      ctx.arc(hx, hy, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#22c55e'
      ctx.fill()
    }
  }, [landmarks, status, calibrationData, currentHandPosition])

  // Determine if overlay should show
  const showOverlay =
    status === 'idle' ||
    status === 'requesting-camera' ||
    status === 'loading-model' ||
    status === 'camera-denied' ||
    status === 'error' ||
    isCalibrationPhase(status)

  if (!showOverlay) {
    return null
  }

  // Show video during calibration/loading
  const showVideo =
    status === 'requesting-camera' ||
    status === 'loading-model' ||
    isCalibrationPhase(status)

  // Calculate progress ring circumference
  const progressRadius = 32
  const progressCircumference = 2 * Math.PI * progressRadius

  const phaseInfo = getPhaseInfo(status)
  const currentStep = getPhaseStep(status)
  const totalSteps = 10

  // All movements verified
  const allVerified = verificationState.leftTested && verificationState.rightTested && verificationState.downTested

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="max-w-lg w-full mx-4 text-center">
        {/* Camera preview during calibration/loading */}
        {showVideo && (
          <div className="mb-6">
            <div className="relative inline-block rounded-xl overflow-hidden border-4 border-green-500 transition-colors">
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-80 h-60 object-cover transform scale-x-[-1] bg-gray-900"
              />

              {/* Hand mesh canvas overlay */}
              <canvas
                ref={canvasRef}
                width={videoWidth}
                height={videoHeight}
                className="absolute inset-0 w-80 h-60 pointer-events-none transform scale-x-[-1]"
              />

              {/* Hand alignment guide (show when no landmarks detected) */}
              {isCalibrationPhase(status) && !landmarks && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Hand size={72} className="text-white/50" />
                </div>
              )}

              {/* Center target during center calibration */}
              {status === 'calibrating-center' && !calibrationData && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-24 h-24 border-2 border-green-400/50 rounded-full" />
                  <div className="absolute w-1 h-6 bg-green-400/50" />
                  <div className="absolute w-6 h-1 bg-green-400/50" />
                </div>
              )}

              {/* Direction arrow overlays */}
              {phaseInfo.showArrow && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {phaseInfo.showArrow === 'left' && (
                    <ArrowLeft size={80} className="text-blue-400 animate-pulse -translate-x-16" />
                  )}
                  {phaseInfo.showArrow === 'right' && (
                    <ArrowRight size={80} className="text-blue-400 animate-pulse translate-x-16" />
                  )}
                  {phaseInfo.showArrow === 'down' && (
                    <ArrowDown size={80} className="text-blue-400 animate-pulse translate-y-12" />
                  )}
                </div>
              )}

              {/* Countdown number overlay */}
              {(phaseInfo.isCountdown || phaseInfo.isReturn) && countdownSeconds > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/60 rounded-full w-24 h-24 flex items-center justify-center">
                    <span className="text-6xl font-bold text-white">{countdownSeconds}</span>
                  </div>
                </div>
              )}

              {/* Progress ring (top right) */}
              {!phaseInfo.isCountdown && !phaseInfo.isReturn && status !== 'verification' && isCalibrationPhase(status) && (
                <div className="absolute top-2 right-2">
                  <svg width="72" height="72" className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="36"
                      cy="36"
                      r={progressRadius}
                      fill="rgba(0,0,0,0.7)"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="4"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="36"
                      cy="36"
                      r={progressRadius}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="4"
                      strokeDasharray={progressCircumference}
                      strokeDashoffset={progressCircumference * (1 - calibrationProgress)}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Percentage text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {Math.round(calibrationProgress * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress steps indicator */}
        {isCalibrationPhase(status) && (
          <div className="flex justify-center items-center gap-1 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i + 1 < currentStep
                    ? 'bg-green-500'
                    : i + 1 === currentStep
                    ? 'bg-blue-500'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}

        {/* Status messages */}
        {status === 'requesting-camera' && (
          <>
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Requesting Camera Access</h2>
            <p className="text-gray-400">Please allow camera access to use hand tracking controls.</p>
          </>
        )}

        {status === 'loading-model' && (
          <>
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Loading Hand Detection</h2>
            <p className="text-gray-400">This may take a few seconds on first load...</p>
          </>
        )}

        {/* Calibration phase messages */}
        {isCalibrationPhase(status) && status !== 'verification' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-3">{phaseInfo.title}</h2>
            <div className={`rounded-lg p-4 mb-4 ${
              phaseInfo.showArrow ? 'bg-blue-500/20 border border-blue-500/50' :
              phaseInfo.isReturn ? 'bg-yellow-500/20 border border-yellow-500/50' :
              'bg-green-500/20 border border-green-500/50'
            }`}>
              <p className={`text-lg font-medium ${
                phaseInfo.showArrow ? 'text-blue-100' :
                phaseInfo.isReturn ? 'text-yellow-100' :
                'text-green-100'
              }`}>
                {landmarks ? phaseInfo.instruction : 'Show your hand in the frame'}
              </p>
            </div>
          </>
        )}

        {/* Verification phase */}
        {status === 'verification' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-3">{phaseInfo.title}</h2>

            {/* Movement test checklist */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
              <div className="space-y-3">
                <div className={`flex items-center gap-3 p-2 rounded ${
                  verificationState.leftTested ? 'bg-green-500/20' : 'bg-gray-700/50'
                }`}>
                  {verificationState.leftTested ? (
                    <Check className="text-green-400" size={24} />
                  ) : (
                    <Circle className="text-gray-500" size={24} />
                  )}
                  <ArrowLeft className="text-blue-400" size={20} />
                  <span className={`font-medium ${
                    verificationState.leftTested ? 'text-green-300' : 'text-gray-300'
                  }`}>
                    Move LEFT
                  </span>
                </div>

                <div className={`flex items-center gap-3 p-2 rounded ${
                  verificationState.rightTested ? 'bg-green-500/20' : 'bg-gray-700/50'
                }`}>
                  {verificationState.rightTested ? (
                    <Check className="text-green-400" size={24} />
                  ) : (
                    <Circle className="text-gray-500" size={24} />
                  )}
                  <ArrowRight className="text-blue-400" size={20} />
                  <span className={`font-medium ${
                    verificationState.rightTested ? 'text-green-300' : 'text-gray-300'
                  }`}>
                    Move RIGHT
                  </span>
                </div>

                <div className={`flex items-center gap-3 p-2 rounded ${
                  verificationState.downTested ? 'bg-green-500/20' : 'bg-gray-700/50'
                }`}>
                  {verificationState.downTested ? (
                    <Check className="text-green-400" size={24} />
                  ) : (
                    <Circle className="text-gray-500" size={24} />
                  )}
                  <ArrowDown className="text-blue-400" size={20} />
                  <span className={`font-medium ${
                    verificationState.downTested ? 'text-green-300' : 'text-gray-300'
                  }`}>
                    Move DOWN
                  </span>
                </div>
              </div>

              <p className="text-gray-400 text-sm mt-3">
                Test each movement to verify detection works correctly
              </p>
            </div>

            {/* Start Game button */}
            <button
              onClick={onCommit}
              disabled={!allVerified}
              className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                allVerified
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {allVerified ? 'Start Game' : 'Test All Movements First'}
            </button>
          </>
        )}

        {status === 'camera-denied' && (
          <>
            <div className="text-red-500 text-5xl mb-4">!</div>
            <h2 className="text-xl font-bold text-white mb-2">Camera Access Denied</h2>
            <p className="text-gray-400 mb-6">
              Hand tracking requires camera access. Please enable camera permissions in your browser
              settings.
            </p>
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">!</div>
            <h2 className="text-xl font-bold text-white mb-2">Error</h2>
            <p className="text-gray-400 mb-6">{error || 'An unexpected error occurred.'}</p>
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </>
        )}

        {/* Pre-calibration instruction (shown before calibrating starts) */}
        {status === 'idle' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-4">Hand Controller Mode</h2>
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-gray-300 font-medium mb-3">Calibration Steps:</p>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">1.</span>
                  <span>Hold your hand in center (~5 seconds)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">2.</span>
                  <span>Show your LEFT movement range</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">3.</span>
                  <span>Show your RIGHT movement range</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">4.</span>
                  <span>Show your DOWN movement range</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">5.</span>
                  <span>Verify movements work, then start game</span>
                </li>
              </ul>
              <p className="text-gray-500 text-xs mt-3">
                Total calibration takes about 30-40 seconds
              </p>
            </div>
            <button
              onClick={onStartCalibration}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
            >
              Begin Calibration
            </button>
          </>
        )}

        {/* Cancel button during calibration (not during verification) */}
        {isCalibrationPhase(status) && status !== 'verification' && (
          <button
            onClick={onCancel}
            className="mt-6 px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
        )}

        {/* Recalibrate option during verification */}
        {status === 'verification' && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Start Over
          </button>
        )}
      </div>
    </div>
  )
}
