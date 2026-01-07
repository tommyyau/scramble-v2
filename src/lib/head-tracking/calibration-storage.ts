// Calibration data persistence using localStorage

import { CalibrationData } from './types'

const CALIBRATION_KEY = 'scramble-head-calibration'
const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

// Save calibration data to localStorage
export function saveCalibration(data: CalibrationData): void {
  try {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save calibration:', err)
  }
}

// Load calibration data from localStorage
export function loadCalibration(): CalibrationData | null {
  try {
    const stored = localStorage.getItem(CALIBRATION_KEY)
    if (!stored) return null

    const data = JSON.parse(stored) as CalibrationData

    // Validate the data structure
    if (
      !data.neutral ||
      !data.left ||
      !data.right ||
      !data.down ||
      !data.thresholds ||
      !data.timestamp
    ) {
      console.warn('Invalid calibration data structure')
      return null
    }

    return data
  } catch (err) {
    console.error('Failed to load calibration:', err)
    return null
  }
}

// Clear calibration data from localStorage
export function clearCalibration(): void {
  try {
    localStorage.removeItem(CALIBRATION_KEY)
  } catch (err) {
    console.error('Failed to clear calibration:', err)
  }
}

// Check if calibration data is expired
export function isCalibrationExpired(
  data: CalibrationData,
  maxAge: number = DEFAULT_MAX_AGE
): boolean {
  return Date.now() - data.timestamp > maxAge
}

// Check if valid calibration exists
export function hasValidCalibration(maxAge: number = DEFAULT_MAX_AGE): boolean {
  const data = loadCalibration()
  if (!data) return false
  return !isCalibrationExpired(data, maxAge)
}
