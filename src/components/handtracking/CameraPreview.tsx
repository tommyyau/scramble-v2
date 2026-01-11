import { type RefObject, useRef, useEffect } from 'react'
import type { HandTrackingStatus, Landmark, HandDirection, TriggerState, CalibrationData, HandPosition } from '../../lib/handtracking/types'
import { drawHandMesh, drawStatusIndicator } from '../../lib/handtracking/mesh-renderer'
import { NeutralZoneOverlay } from './NeutralZoneOverlay'

interface CameraPreviewProps {
  status: HandTrackingStatus
  videoRef: RefObject<HTMLVideoElement | null>
  landmarks?: Landmark[] | null
  detectedDirection?: HandDirection
  triggerState: TriggerState
  calibrationData: CalibrationData | null
  currentHandPosition: HandPosition | null
}

export function CameraPreview({
  status,
  videoRef,
  landmarks,
  detectedDirection,
  triggerState,
  calibrationData,
  currentHandPosition,
}: CameraPreviewProps) {
  const isActive = status === 'active'
  const isHandLost = status === 'hand-lost'
  const previewRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Preview dimensions
  const previewWidth = 128
  const previewHeight = 96

  // Mirror the stream from the main video element to the preview
  useEffect(() => {
    if (previewRef.current && videoRef.current?.srcObject) {
      previewRef.current.srcObject = videoRef.current.srcObject
    }
  }, [videoRef, status])

  // Draw hand mesh on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, previewWidth, previewHeight)

    // Only draw when active and have landmarks
    if (!isActive || !landmarks || landmarks.length < 21) return

    // Draw hand mesh
    drawHandMesh(ctx, landmarks, previewWidth, previewHeight, {
      landmarkRadius: 2,
      connectionWidth: 1,
    }, detectedDirection)

    // Draw status indicator
    if (detectedDirection) {
      drawStatusIndicator(ctx, previewWidth, previewHeight, 'pointing', detectedDirection)
    } else {
      drawStatusIndicator(ctx, previewWidth, previewHeight, 'detected')
    }
  }, [landmarks, isActive, detectedDirection])

  return (
    <div className="relative">
      <div
        className={`
          relative overflow-hidden rounded-lg border-2 transition-colors
          ${isHandLost ? 'border-red-500' : isActive ? 'border-green-500' : 'border-gray-600'}
        `}
      >
        <video
          ref={previewRef}
          autoPlay
          playsInline
          muted
          className="w-32 h-24 object-cover transform scale-x-[-1]"
        />

        {/* Hand mesh canvas overlay */}
        <canvas
          ref={canvasRef}
          width={previewWidth}
          height={previewHeight}
          className="absolute inset-0 w-32 h-24 pointer-events-none transform scale-x-[-1]"
        />

        {/* Neutral zone overlay - only show when active and calibrated */}
        {isActive && calibrationData && (
          <NeutralZoneOverlay
            calibrationData={calibrationData}
            currentHandPosition={currentHandPosition}
            triggerState={triggerState}
            width={previewWidth}
            height={previewHeight}
          />
        )}

        {/* Status overlay */}
        {status === 'loading-model' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-white text-xs text-center">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mx-auto mb-1" />
              Loading...
            </div>
          </div>
        )}

        {isHandLost && (
          <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center">
            <span className="text-white text-xs font-medium">Hand Lost</span>
          </div>
        )}
      </div>

      {/* Status indicator dot */}
      <div
        className={`
          absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900
          ${isHandLost ? 'bg-red-500' : isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}
        `}
      />

      {/* Trigger state indicator */}
      {isActive && triggerState !== 'neutral' && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500 text-black">
          {triggerState === 'triggered_left' && 'LEFT'}
          {triggerState === 'triggered_right' && 'RIGHT'}
          {triggerState === 'triggered_drop' && 'DROP'}
        </div>
      )}
    </div>
  )
}
