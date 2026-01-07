import React, { type RefObject } from 'react'
import type { HeadTrackingStatus } from '../../lib/headtracking/types'

interface CameraPreviewProps {
  status: HeadTrackingStatus
  videoRef: RefObject<HTMLVideoElement | null>
}

export function CameraPreview({ status, videoRef }: CameraPreviewProps) {
  const isActive = status === 'active'
  const isFaceLost = status === 'face-lost'
  const previewRef = React.useRef<HTMLVideoElement>(null)

  // Mirror the stream from the main video element to the preview
  React.useEffect(() => {
    if (previewRef.current && videoRef.current?.srcObject) {
      previewRef.current.srcObject = videoRef.current.srcObject
    }
  }, [videoRef, status])

  return (
    <div className="relative">
      <div
        className={`
          relative overflow-hidden rounded-lg border-2 transition-colors
          ${isFaceLost ? 'border-red-500' : isActive ? 'border-green-500' : 'border-gray-600'}
        `}
      >
        <video
          ref={previewRef}
          autoPlay
          playsInline
          muted
          className="w-32 h-24 object-cover transform scale-x-[-1]"
        />

        {/* Status overlay */}
        {status === 'loading-model' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-white text-xs text-center">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mx-auto mb-1" />
              Loading...
            </div>
          </div>
        )}

        {isFaceLost && (
          <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center">
            <span className="text-white text-xs font-medium">Face Lost</span>
          </div>
        )}
      </div>

      {/* Status indicator dot */}
      <div
        className={`
          absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900
          ${isFaceLost ? 'bg-red-500' : isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}
        `}
      />
    </div>
  )
}
