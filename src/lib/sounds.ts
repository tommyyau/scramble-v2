// Sound effects using Web Audio API - no external files needed

const SOUND_STORAGE_KEY = 'scramble-sound-enabled'

let audioContext: AudioContext | null = null

// Load saved preference or default to enabled
function loadSoundPreference(): boolean {
  try {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY)
    return saved === null ? true : saved === 'true'
  } catch {
    return true
  }
}

let soundEnabled = loadSoundPreference()

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled))
  } catch {
    // localStorage not available
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled
}

// Play a simple tone
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
  delay: number = 0
) {
  if (!soundEnabled) return

  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.value = frequency

    const startTime = ctx.currentTime + delay
    gainNode.gain.setValueAtTime(volume, startTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  } catch (e) {
    // Audio not supported or blocked
  }
}

// Play multiple tones in sequence (arpeggio)
function playArpeggio(frequencies: number[], noteDuration: number, type: OscillatorType = 'sine', volume: number = 0.2) {
  frequencies.forEach((freq, i) => {
    playTone(freq, noteDuration, type, volume, i * noteDuration * 0.7)
  })
}

// === GAME SOUND EFFECTS ===

// Block lands with a soft thunk
export function playBlockLand() {
  playTone(150, 0.08, 'triangle', 0.15)
}

// Word cleared - satisfying pop
export function playWordClear() {
  playTone(523, 0.1, 'sine', 0.25) // C5
  playTone(659, 0.1, 'sine', 0.2, 0.05) // E5
  playTone(784, 0.15, 'sine', 0.15, 0.1) // G5
}

// Chain reaction - rising excitement
export function playChain(chainCount: number) {
  const baseFreq = 400 + (chainCount - 1) * 100
  playArpeggio(
    [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2],
    0.08,
    'square',
    0.15
  )
}

// Level up fanfare
export function playLevelUp() {
  playArpeggio([523, 659, 784, 1047], 0.12, 'sine', 0.25) // C5, E5, G5, C6
}

// Game over - descending sad tone
export function playGameOver() {
  playArpeggio([392, 349, 330, 262], 0.2, 'sine', 0.2) // G4, F4, E4, C4
}

// Streak started/continued - quick upward blip
export function playStreakContinue(streakCount: number) {
  const freq = 600 + streakCount * 50
  playTone(freq, 0.06, 'sine', 0.15)
  playTone(freq * 1.5, 0.08, 'sine', 0.1, 0.04)
}

// Streak broken - sad descending
export function playStreakBroken() {
  playTone(400, 0.1, 'sawtooth', 0.1)
  playTone(300, 0.15, 'sawtooth', 0.08, 0.08)
}

// Danger warning - pulsing alarm
export function playDangerWarning() {
  playTone(220, 0.1, 'square', 0.1)
  playTone(220, 0.1, 'square', 0.1, 0.15)
}

// Move block - subtle click
export function playMove() {
  playTone(800, 0.02, 'sine', 0.05)
}

// Drop block - whoosh
export function playDrop() {
  playTone(300, 0.05, 'sine', 0.1)
  playTone(200, 0.08, 'sine', 0.08, 0.03)
  playTone(100, 0.1, 'sine', 0.05, 0.06)
}
