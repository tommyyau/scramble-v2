import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, ArrowDown, Circle, X, RotateCcw, Check } from 'lucide-react'
import { useCalibration } from '../../hooks/useCalibration'
import { CalibrationStep, CalibrationData } from '../../lib/head-tracking/types'

interface CalibrationOverlayProps {
  onComplete: (data: CalibrationData) => void
  onCancel: () => void
}

const STEP_INSTRUCTIONS: Record<CalibrationStep, { title: string; instruction: string }> = {
  'requesting-camera': {
    title: 'Requesting Camera Access',
    instruction: 'Please allow camera access to continue...',
  },
  neutral: {
    title: 'Neutral Position',
    instruction: 'Look straight at the camera and hold still',
  },
  left: {
    title: 'Face Left',
    instruction: 'Turn your head to the left and hold still',
  },
  right: {
    title: 'Face Right',
    instruction: 'Turn your head to the right and hold still',
  },
  down: {
    title: 'Tilt Down',
    instruction: 'Tilt your head down and hold still',
  },
  complete: {
    title: 'Calibration Complete!',
    instruction: 'Your head tracking is ready',
  },
}

const STEP_ICONS: Record<CalibrationStep, React.ReactNode> = {
  'requesting-camera': <Circle className="animate-pulse" size={48} />,
  neutral: <Circle size={48} />,
  left: <ArrowLeft size={48} />,
  right: <ArrowRight size={48} />,
  down: <ArrowDown size={48} />,
  complete: <Check size={48} />,
}

export default function CalibrationOverlay({ onComplete, onCancel }: CalibrationOverlayProps) {
  const {
    step,
    progress,
    error,
    isCapturing,
    videoRef,
    startCalibration,
    captureCurrentStep,
    retryStep,
    cancelCalibration,
  } = useCalibration({
    onComplete,
    onCancel,
  })

  // Start calibration on mount
  useEffect(() => {
    startCalibration()
  }, [startCalibration])

  const handleCancel = () => {
    cancelCalibration()
    onCancel()
  }

  const stepInfo = STEP_INSTRUCTIONS[step]
  const stepIcon = STEP_ICONS[step]
  const isReadyToCapture = step !== 'requesting-camera' && step !== 'complete' && !isCapturing

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 z-50">
      {/* Header with cancel button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleCancel}
          className="p-2 rounded-full bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          aria-label="Cancel calibration"
        >
          <X size={24} />
        </button>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-2">Head Tracking Setup</h1>

      {/* Step progress indicators */}
      <div className="flex gap-2 mb-6">
        {(['neutral', 'left', 'right', 'down'] as const).map((s, index) => {
          const stepOrder = ['neutral', 'left', 'right', 'down', 'complete']
          const currentIndex = stepOrder.indexOf(step)
          const thisIndex = index
          const isCompleted = currentIndex > thisIndex
          const isCurrent = step === s

          return (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                isCompleted
                  ? 'bg-green-500'
                  : isCurrent
                  ? 'bg-primary animate-pulse'
                  : 'bg-slate-600'
              }`}
            />
          )
        })}
      </div>

      {/* Video preview */}
      <div className="relative w-80 h-60 rounded-xl overflow-hidden bg-slate-800 mb-6 shadow-lg">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror for natural feel
          autoPlay
          playsInline
          muted
        />

        {/* Direction overlay */}
        {step !== 'requesting-camera' && step !== 'complete' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`text-white/30 ${
                isCapturing ? 'text-primary/50 animate-pulse' : ''
              }`}
            >
              {stepIcon}
            </div>
          </div>
        )}

        {/* Progress bar during capture */}
        {isCapturing && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-900/50">
            <div
              className="h-full bg-primary transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-1">{stepInfo.title}</h2>
        <p className="text-slate-400">{stepInfo.instruction}</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
          <span className="text-red-400 text-sm">{error}</span>
          <button
            onClick={retryStep}
            className="p-1 rounded hover:bg-red-500/20 transition-colors"
            aria-label="Retry"
          >
            <RotateCcw size={16} className="text-red-400" />
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-4">
        {step === 'complete' ? (
          <button
            onClick={() => onComplete}
            className="px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg"
          >
            Start Game
          </button>
        ) : isReadyToCapture ? (
          <button
            onClick={captureCurrentStep}
            className="px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg animate-pulse"
          >
            Capture
          </button>
        ) : isCapturing ? (
          <div className="px-8 py-3 bg-slate-700 text-slate-300 font-semibold rounded-xl">
            Hold still...
          </div>
        ) : null}
      </div>

      {/* Help text */}
      <p className="mt-8 text-sm text-slate-500 text-center max-w-md">
        We'll calibrate your head movements to control the game.
        Make sure your face is well-lit and clearly visible.
      </p>
    </div>
  )
}
