import { RefObject } from 'react'
import { HeadGesture } from '../../lib/head-tracking/types'

interface HeadTrackingPreviewProps {
  videoRef: RefObject<HTMLVideoElement>
  currentGesture: HeadGesture
  isTracking: boolean
}

export default function HeadTrackingPreview({
  videoRef,
  currentGesture,
  isTracking,
}: HeadTrackingPreviewProps) {
  return (
    <div className="flex flex-col items-center mb-2">
      {/* Video preview container */}
      <div className="relative w-32 h-24 sm:w-40 sm:h-30 rounded-lg overflow-hidden bg-slate-800 shadow-md">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror for natural feel
          autoPlay
          playsInline
          muted
        />

        {/* Tracking status indicator */}
        <div className="absolute top-1 right-1">
          <div
            className={`w-2 h-2 rounded-full ${
              isTracking ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
        </div>

        {/* Current gesture indicator */}
        {currentGesture && currentGesture !== 'neutral' && (
          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-primary/80 rounded text-xs text-white font-medium">
            {currentGesture.toUpperCase()}
          </div>
        )}
      </div>

      {/* Label */}
      <span className="text-xs text-slate-500 mt-1">Head Tracking</span>
    </div>
  )
}
