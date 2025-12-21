import { useRef, useEffect, useState, useMemo } from 'react'
import Block from './Block'
import Particles from '../effects/Particles'
import { Block as BlockType, ClearedPosition } from '../../lib/types'
import { GRID_WIDTH, GRID_HEIGHT } from '../../lib/constants'
import { playDangerWarning } from '../../lib/sounds'

interface ParticleEvent {
  id: number
  positions: ClearedPosition[]
}

interface BoardProps {
  blocks: BlockType[]
  onMoveLeft: () => void
  onMoveRight: () => void
  onDrop: () => void
  particleEvent?: ParticleEvent | null
  onParticlesComplete?: () => void
}

// Calculate danger level based on highest locked block
function getDangerLevel(blocks: BlockType[]): number {
  const lockedBlocks = blocks.filter(b => b.locked)
  if (lockedBlocks.length === 0) return 0

  const highestY = Math.min(...lockedBlocks.map(b => b.y))

  // Danger levels: row 0 = critical(3), row 1 = high(2), row 2 = warning(1)
  if (highestY === 0) return 3
  if (highestY === 1) return 2
  if (highestY === 2) return 1
  return 0
}

// Calculate where the active block would land (drop shadow position)
function getDropShadowPosition(blocks: BlockType[]): { x: number; y: number; letter: string } | null {
  const activeBlock = blocks.find(b => !b.locked)
  if (!activeBlock) return null

  const lockedBlocks = blocks.filter(b => b.locked)

  // Find the lowest Y position this block can fall to
  let landingY = GRID_HEIGHT - 1 // Start at bottom

  // Check for collision with locked blocks in the same column
  for (const locked of lockedBlocks) {
    if (locked.x === activeBlock.x && locked.y > activeBlock.y) {
      // This locked block is below our active block in the same column
      landingY = Math.min(landingY, locked.y - 1)
    }
  }

  // If the active block is already at or below the landing position, no shadow needed
  if (activeBlock.y >= landingY) return null

  return {
    x: activeBlock.x,
    y: landingY,
    letter: activeBlock.letter,
  }
}

export default function Board({ blocks, onMoveLeft, onMoveRight, onDrop, particleEvent, onParticlesComplete }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(40)

  // Calculate cell size based on viewport
  useEffect(() => {
    const updateSize = () => {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // On mobile, use more of the width (90%)
      // On desktop, cap at a reasonable max
      const isMobile = viewportWidth < 640

      // Calculate available space
      // Reserve space for: header (~56px), stats row (~80px), controls (~80px), padding
      const reservedHeight = isMobile ? 280 : 240
      const availableHeight = viewportHeight - reservedHeight

      // Width: use 90% on mobile, up to 480px on desktop
      const availableWidth = isMobile
        ? viewportWidth * 0.9
        : Math.min(viewportWidth * 0.8, 480)

      // Calculate cell size to fit the grid
      const cellFromWidth = availableWidth / GRID_WIDTH
      const cellFromHeight = availableHeight / GRID_HEIGHT

      // Use the smaller dimension to ensure grid fits
      const size = Math.floor(Math.min(cellFromWidth, cellFromHeight))

      // Set minimum cell size of 36px, maximum of 60px
      setCellSize(Math.max(36, Math.min(size, 60)))
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          onMoveLeft()
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          onMoveRight()
          break
        case 'ArrowDown':
        case 's':
        case 'S':
        case ' ':
          e.preventDefault()
          onDrop()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onMoveLeft, onMoveRight, onDrop])

  // Handle touch/swipe
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current

    const minSwipeDistance = 20

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > minSwipeDistance) {
        onMoveRight()
      } else if (deltaX < -minSwipeDistance) {
        onMoveLeft()
      }
    } else {
      // Vertical swipe
      if (deltaY > minSwipeDistance) {
        onDrop()
      }
    }
  }

  const boardWidth = GRID_WIDTH * cellSize
  const boardHeight = GRID_HEIGHT * cellSize

  // Calculate danger level for visual warning
  const dangerLevel = useMemo(() => getDangerLevel(blocks), [blocks])

  // Track previous danger level to only play sound on increase
  const prevDangerLevelRef = useRef(0)

  // Play danger warning sound when danger level increases to >= 2
  useEffect(() => {
    if (dangerLevel >= 2 && prevDangerLevelRef.current < 2) {
      playDangerWarning()
    }
    prevDangerLevelRef.current = dangerLevel
  }, [dangerLevel])

  // Calculate drop shadow position
  const dropShadow = useMemo(() => getDropShadowPosition(blocks), [blocks])

  // Danger zone styles
  const dangerBorderColor = dangerLevel === 3
    ? 'ring-red-500/80'
    : dangerLevel === 2
    ? 'ring-orange-500/60'
    : dangerLevel === 1
    ? 'ring-yellow-500/40'
    : ''

  const dangerRingWidth = dangerLevel > 0 ? 'ring-2' : ''
  const dangerAnimation = dangerLevel >= 2 ? 'animate-pulse' : ''

  return (
    <div
      ref={boardRef}
      className={`relative bg-slate-800/50 rounded-xl overflow-hidden touch-none ${dangerRingWidth} ${dangerBorderColor} ${dangerAnimation}`}
      style={{
        width: boardWidth,
        height: boardHeight,
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Danger zone overlay - top 3 rows */}
      {dangerLevel > 0 && (
        <div
          className="absolute left-0 right-0 top-0 pointer-events-none z-10"
          style={{ height: 3 * cellSize }}
        >
          <div
            className={`absolute inset-0 ${
              dangerLevel === 3
                ? 'bg-gradient-to-b from-red-500/30 to-transparent animate-pulse'
                : dangerLevel === 2
                ? 'bg-gradient-to-b from-orange-500/20 to-transparent'
                : 'bg-gradient-to-b from-yellow-500/10 to-transparent'
            }`}
          />
          {/* Danger line marker */}
          <div
            className={`absolute left-0 right-0 bottom-0 h-0.5 ${
              dangerLevel === 3
                ? 'bg-red-500/60'
                : dangerLevel === 2
                ? 'bg-orange-500/40'
                : 'bg-yellow-500/30'
            }`}
          />
        </div>
      )}

      {/* Grid lines */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: GRID_WIDTH - 1 }).map((_, i) => (
          <div
            key={`v${i}`}
            className="absolute top-0 bottom-0 w-px bg-slate-700/30"
            style={{ left: (i + 1) * cellSize }}
          />
        ))}
        {Array.from({ length: GRID_HEIGHT - 1 }).map((_, i) => (
          <div
            key={`h${i}`}
            className="absolute left-0 right-0 h-px bg-slate-700/30"
            style={{ top: (i + 1) * cellSize }}
          />
        ))}
      </div>

      {/* Drop shadow preview - shows where block will land */}
      {dropShadow && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: dropShadow.x * cellSize + 2,
            top: dropShadow.y * cellSize + 2,
            width: cellSize - 4,
            height: cellSize - 4,
          }}
        >
          <div className="w-full h-full rounded-lg border-2 border-dashed border-white/30 bg-white/5 flex items-center justify-center">
            <span className="text-white/20 font-bold text-lg">{dropShadow.letter}</span>
          </div>
        </div>
      )}

      {/* Blocks */}
      {blocks.map((block) => (
        <Block key={block.id} block={block} cellSize={cellSize} />
      ))}

      {/* Particle effects when words are cleared */}
      {particleEvent && particleEvent.positions.map((pos, index) => (
        <Particles
          key={`particle-${particleEvent.id}-${index}`}
          x={pos.x * cellSize + cellSize / 2}
          y={pos.y * cellSize + cellSize / 2}
          count={8}
          colors={[pos.color, '#ffffff', '#FFE66D']}
          onComplete={index === 0 ? onParticlesComplete : undefined}
        />
      ))}
    </div>
  )
}
