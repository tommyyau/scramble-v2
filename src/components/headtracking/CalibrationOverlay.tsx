import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import type { HeadTrackingStatus } from '../../lib/headtracking/types'
import { Check, ArrowLeft, ArrowRight, ArrowDown } from 'lucide-react'

interface CalibrationOverlayProps {
  status: HeadTrackingStatus
  error: string | null
  videoRef: RefObject<HTMLVideoElement | null>
  onStartCalibration: () => void
  onProceedToGame: () => void
  onCancel: () => void
}

export function CalibrationOverlay({
  status,
  error,
  videoRef,
  onStartCalibration,
  onProceedToGame,
  onCancel,
}: CalibrationOverlayProps) {
  const [neutralCountdown, setNeutralCountdown] = useState<number | null>(null)

  // Countdown for neutral calibration phase
  useEffect(() => {
    if (status === 'calibrating-neutral') {
      setNeutralCountdown(3)
      const interval = setInterval(() => {
        setNeutralCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval)
            return null
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [status])

  // Determine if overlay should show
  const showOverlay =
    status === 'idle' ||
    status === 'requesting-camera' ||
    status === 'loading-model' ||
    status === 'calibrating-neutral' ||
    status === 'calibrating-left' ||
    status === 'calibrating-left-detected' ||
    status === 'calibrating-right' ||
    status === 'calibrating-right-detected' ||
    status === 'calibrating-down' ||
    status === 'calibrating-down-detected' ||
    status === 'calibration-complete' ||
    status === 'camera-denied' ||
    status === 'error'

  if (!showOverlay) {
    return null
  }

  // Show video during calibration steps
  const showVideo =
    status === 'requesting-camera' ||
    status === 'loading-model' ||
    status === 'calibrating-neutral' ||
    status === 'calibrating-left' ||
    status === 'calibrating-left-detected' ||
    status === 'calibrating-right' ||
    status === 'calibrating-right-detected' ||
    status === 'calibrating-down' ||
    status === 'calibrating-down-detected' ||
    status === 'calibration-complete'

  // Check which steps are completed
  const isLeftDone =
    status === 'calibrating-left-detected' ||
    status === 'calibrating-right' ||
    status === 'calibrating-right-detected' ||
    status === 'calibrating-down' ||
    status === 'calibrating-down-detected' ||
    status === 'calibration-complete'

  const isRightDone =
    status === 'calibrating-right-detected' ||
    status === 'calibrating-down' ||
    status === 'calibrating-down-detected' ||
    status === 'calibration-complete'

  const isDownDone = status === 'calibrating-down-detected' || status === 'calibration-complete'

  // Get border color based on status
  const getBorderColor = () => {
    if (status === 'calibrating-left-detected') return 'border-green-500'
    if (status === 'calibrating-right-detected') return 'border-green-500'
    if (status === 'calibrating-down-detected') return 'border-green-500'
    if (status === 'calibration-complete') return 'border-green-500'
    return 'border-blue-500'
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center">
        {/* Camera preview during calibration/loading */}
        {showVideo && (
          <div className="mb-6">
            <div
              className={`relative inline-block rounded-xl overflow-hidden border-4 transition-colors ${getBorderColor()}`}
            >
              <video
                autoPlay
                playsInline
                muted
                className="w-64 h-48 object-cover transform scale-x-[-1] bg-gray-900"
                ref={(el) => {
                  // Mirror the stream from the main video element
                  if (el && videoRef.current?.srcObject) {
                    el.srcObject = videoRef.current.srcObject
                  }
                }}
              />

              {/* Face alignment guide for neutral */}
              {status === 'calibrating-neutral' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-24 h-32 border-2 border-dashed border-white/50 rounded-full" />
                </div>
              )}

              {/* Direction arrow overlays */}
              {status === 'calibrating-left' && (
                <div className="absolute inset-0 flex items-center justify-start pl-4 pointer-events-none">
                  <ArrowLeft size={48} className="text-blue-400 animate-pulse" />
                </div>
              )}

              {status === 'calibrating-right' && (
                <div className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none">
                  <ArrowRight size={48} className="text-blue-400 animate-pulse" />
                </div>
              )}

              {status === 'calibrating-down' && (
                <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
                  <ArrowDown size={48} className="text-blue-400 animate-pulse" />
                </div>
              )}

              {/* Detection confirmation overlays */}
              {(status === 'calibrating-left-detected' ||
                status === 'calibrating-right-detected' ||
                status === 'calibrating-down-detected') && (
                <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                  <Check size={64} className="text-green-400" />
                </div>
              )}

              {/* Countdown overlay for neutral */}
              {neutralCountdown !== null && status === 'calibrating-neutral' && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-6xl font-bold text-white animate-pulse">
                    {neutralCountdown}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress indicators for calibration steps */}
        {(status.startsWith('calibrating-') || status === 'calibration-complete') &&
          status !== 'calibrating-neutral' && (
            <div className="flex justify-center gap-6 mb-6">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${isLeftDone ? 'bg-green-500' : status === 'calibrating-left' ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'}`}
                >
                  {isLeftDone ? (
                    <Check size={20} className="text-white" />
                  ) : (
                    <ArrowLeft size={20} className="text-white" />
                  )}
                </div>
                <span className="text-xs text-gray-400 mt-1">Left</span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${isRightDone ? 'bg-green-500' : status === 'calibrating-right' ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'}`}
                >
                  {isRightDone ? (
                    <Check size={20} className="text-white" />
                  ) : (
                    <ArrowRight size={20} className="text-white" />
                  )}
                </div>
                <span className="text-xs text-gray-400 mt-1">Right</span>
              </div>

              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${isDownDone ? 'bg-green-500' : status === 'calibrating-down' ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'}`}
                >
                  {isDownDone ? (
                    <Check size={20} className="text-white" />
                  ) : (
                    <ArrowDown size={20} className="text-white" />
                  )}
                </div>
                <span className="text-xs text-gray-400 mt-1">Down</span>
              </div>
            </div>
          )}

        {/* Status messages */}
        {status === 'requesting-camera' && (
          <>
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Requesting Camera Access</h2>
            <p className="text-gray-400">Please allow camera access to use head tracking controls.</p>
          </>
        )}

        {status === 'loading-model' && (
          <>
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Loading Face Detection</h2>
            <p className="text-gray-400">This may take a few seconds on first load...</p>
          </>
        )}

        {status === 'calibrating-neutral' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-3">Step 1: Neutral Position</h2>
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-2">
              <p className="text-blue-100 text-lg font-medium">Look straight ahead at the camera</p>
              <p className="text-blue-200/80 text-sm mt-1">
                Hold still while we capture your neutral position
              </p>
            </div>
          </>
        )}

        {status === 'calibrating-left' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-3">Step 2: Tilt Left</h2>
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-2">
              <p className="text-blue-100 text-lg font-medium">Tilt your head to the LEFT</p>
              <p className="text-blue-200/80 text-sm mt-1">
                Keep tilting until we detect the movement
              </p>
            </div>
          </>
        )}

        {status === 'calibrating-left-detected' && (
          <>
            <h2 className="text-2xl font-bold text-green-400 mb-3">Left Detected!</h2>
            <p className="text-gray-400">Great! Moving to next step...</p>
          </>
        )}

        {status === 'calibrating-right' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-3">Step 3: Tilt Right</h2>
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-2">
              <p className="text-blue-100 text-lg font-medium">Tilt your head to the RIGHT</p>
              <p className="text-blue-200/80 text-sm mt-1">
                Keep tilting until we detect the movement
              </p>
            </div>
          </>
        )}

        {status === 'calibrating-right-detected' && (
          <>
            <h2 className="text-2xl font-bold text-green-400 mb-3">Right Detected!</h2>
            <p className="text-gray-400">Great! Moving to next step...</p>
          </>
        )}

        {status === 'calibrating-down' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-3">Step 4: Tilt Down</h2>
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-2">
              <p className="text-blue-100 text-lg font-medium">Tilt your head DOWN</p>
              <p className="text-blue-200/80 text-sm mt-1">This will be used to drop blocks</p>
            </div>
          </>
        )}

        {status === 'calibrating-down-detected' && (
          <>
            <h2 className="text-2xl font-bold text-green-400 mb-3">Down Detected!</h2>
            <p className="text-gray-400">Calibration complete!</p>
          </>
        )}

        {status === 'calibration-complete' && (
          <>
            <h2 className="text-2xl font-bold text-green-400 mb-3">Calibration Complete!</h2>
            <p className="text-gray-400 mb-6">
              All movements verified. You're ready to play!
            </p>
            <button
              onClick={onProceedToGame}
              className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium text-lg"
            >
              Start Game
            </button>
          </>
        )}

        {status === 'camera-denied' && (
          <>
            <div className="text-red-500 text-5xl mb-4">!</div>
            <h2 className="text-xl font-bold text-white mb-2">Camera Access Denied</h2>
            <p className="text-gray-400 mb-6">
              Head tracking requires camera access. Please enable camera permissions in your browser
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
            <h2 className="text-2xl font-bold text-white mb-4">Head Tracking Mode</h2>
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-gray-300 font-medium mb-3">How to play:</p>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-center gap-2">
                  <ArrowLeft size={16} className="text-blue-400" />
                  <span className="text-blue-400">Tilt left</span>
                  <span className="text-gray-500">→</span>
                  <span>Move block left</span>
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight size={16} className="text-blue-400" />
                  <span className="text-blue-400">Tilt right</span>
                  <span className="text-gray-500">→</span>
                  <span>Move block right</span>
                </li>
                <li className="flex items-center gap-2">
                  <ArrowDown size={16} className="text-blue-400" />
                  <span className="text-blue-400">Tilt down</span>
                  <span className="text-gray-500">→</span>
                  <span>Drop block</span>
                </li>
              </ul>
              <p className="text-gray-500 text-xs mt-3">Return to neutral position between moves</p>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              We'll verify each movement works before starting the game.
            </p>
            <button
              onClick={onStartCalibration}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
            >
              Start Calibration
            </button>
          </>
        )}

        {/* Cancel button during calibration */}
        {(status.startsWith('calibrating-') || status === 'calibration-complete') && (
          <button
            onClick={onCancel}
            className="mt-6 px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
