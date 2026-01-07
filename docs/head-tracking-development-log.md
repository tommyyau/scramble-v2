# Head Tracking Feature Development Log

**Date:** 2026-01-07
**Duration:** ~45 minutes
**Branch:** `head-controller`

This document captures the iterative development process for adding head tracking controls to the Scramble word game, including the exact prompts given and the bugs encountered along the way.

---

## Prompt 1: Initial Feature Request

### User Prompt
> "The game has basically three movements: left, right, and down. I want to actually replicate this by using the video camera instead of the arrow keys or swiping on the touch. The video camera will basically track the person's head, and the person's head can tilt left, tilt right, and tilt down. Based on what the head is doing, it will actually move the game, so you can go left, right, down, and obviously that's going to be a level of inaccuracy, but that makes a bit more fun. I have no idea how to actually engage with the camera or how to actually track the player's head movements, but I want you to actually help me build that. Are there any other clarifications? Basically, instead of using the arrow keys, I want to actually track the player's head and depending on whether it's tilting down or facing left or facing right, you will be able to actually make the movements of the game. I want to create an additional option and let's call it 'Classic Experimental,' and that will actually then overlay the new controls. This will be a test for that experimental game. Please think about how we would do this and ask for clarification questions."

**Follow-up amendment:**
> "With regards to the small preview, I think that I'd like to actually have the small video preview near to where the controls are..."

### What Was Requested
- Add head tracking controls using the device camera
- Tilt head left → move block left
- Tilt head right → move block right
- Tilt head down → hard drop
- Camera preview positioned near the control buttons
- Calibration step to set neutral head position
- Control flash feedback when head movement triggers an action

### What Claude Built
- New "Classic Experimental" game mode with `usesHeadTracking: true`
- MediaPipe Face Mesh integration for face landmark detection
- New files:
  - `src/lib/headtracking/types.ts` - HeadPose, HeadTrackingStatus types
  - `src/lib/headtracking/pose-calculator.ts` - Pure functions for pose calculation
  - `src/hooks/useHeadTracking.ts` - Core head tracking React hook
  - `src/components/headtracking/CameraPreview.tsx` - Small video preview
  - `src/components/headtracking/CalibrationOverlay.tsx` - Full-screen calibration UI
- Updated Game.tsx, ModeSelect.tsx, Controls.tsx, constants.ts, types.ts

### Build Errors Encountered
- `NodeJS.Timeout` type not recognized in browser environment
- RefObject type mismatches with video elements
- Missing `'classic-experimental'` in HighScores and Leaderboard components

### Fixes Applied
- Changed `useRef<NodeJS.Timeout>` to `useRef<ReturnType<typeof setTimeout>>`
- Added type assertions: `videoRef as React.RefObject<HTMLVideoElement>`
- Added 'classic-experimental' to all mode mappings in HighScores/Leaderboard

---

## Prompt 2: Video Element Error

### User Prompt
> "! Error Video element not available. This is what happens when I basically run it."

### Problem
When launching the experimental mode, the app displayed an error "Video element not available" instead of starting the camera.

### Root Cause
The `useHeadTracking` hook was trying to access `videoRef.current` during initialization, but the video element hadn't been mounted to the DOM yet. The hook's `useEffect` was running before React had attached the ref.

### Fix Applied
1. Removed the auto-initialization `useEffect` from `useHeadTracking`
2. Added a hidden `<video>` element inside `CalibrationOverlay` that's always in the DOM
3. Camera initialization now happens when user clicks "Start Calibration" (after elements are mounted)

---

## Prompt 3: Camera Preview Empty After Calibration

### User Prompt
> "It doesn't seem the camera's on, but there doesn't seem to be a preview of my head or anything like that. Although it did calibrate and take a picture of my head. There were no instructions on the calibration."

### Problem
- Calibration appeared to work (face was detected)
- But after calibration completed, the camera preview box was empty
- Calibration instructions weren't visible enough

### Root Cause
The hidden `<video>` element was inside `CalibrationOverlay`. When calibration completed, the overlay unmounted, destroying the video element and its camera stream. The `CameraPreview` component then had nothing to display.

### Fixes Applied
1. Moved the hidden video element from `CalibrationOverlay` to `Game.tsx` so it persists throughout gameplay
2. Enhanced calibration instructions with a highlighted box and clearer text
3. Added `useEffect` in `CameraPreview` to mirror the stream from the hidden video to the preview

---

## Prompt 4: Game Starts Before Calibration + Interactive Calibration Request

### User Prompt
> "When I start an experimental game, the game is actually starting immediately in the background, and I have not calibrated my head yet. And then, well, it gets all confused because it does not recognise my head movements as well. So, can you update it so that when we do the calibration, we basically say it turns your head left and you can actually detect the turning of the head left and it matches it? And you might have to actually do it once or twice or three times to make sure that it's done it then turn right and then again clarification that is recognise your head movements and your down movement so you want it to actually verify that you've got left right and down? And then once it's got verified that. You might say, click to proceed or next etc."

### Problems Identified
1. Game was starting in the background before calibration completed
2. Old calibration only captured neutral position - didn't verify movements actually worked
3. User wanted interactive step-by-step calibration with verification

### Fixes Applied
1. **Delayed game start:** Added `pendingMode` state - `startGame()` now only called after calibration completes and user clicks "Start Game"

2. **New calibration status types:**
   - `calibrating-neutral` - Capturing neutral head position
   - `calibrating-left` - Waiting for left tilt
   - `calibrating-left-detected` - Left detected, showing confirmation
   - `calibrating-right` - Waiting for right tilt
   - `calibrating-right-detected` - Right detected, showing confirmation
   - `calibrating-down` - Waiting for down tilt
   - `calibrating-down-detected` - Down detected, showing confirmation
   - `calibration-complete` - All verified, ready to start

3. **Rewrote CalibrationOverlay** with:
   - Progress indicators (circles with checkmarks)
   - Arrow overlays on video showing which direction to tilt
   - Green checkmark overlay when movement detected
   - "Start Game" button only appears after all movements verified

---

## Prompt 5: Calibration Stuck on Neutral Position

### User Prompt
> "It's trying to... well, nothing happens. I don't know how long I'm supposed to hold my neutral position for, but I would have thought it would only be a couple of seconds, and then it will ask me to do the next position. But it seemed to be just stuck there, and the camera was actually flashing a little bit."

### Problem
Calibration was stuck on "Step 1: Neutral Position" forever. The face was being detected (camera flashing indicated processing), but the status never progressed to "calibrating-left".

### Root Cause
**React closure bug.** The `onResults` callback was registered once with FaceMesh during initialization. It captured the initial `status` value ('idle') in its closure. Even though `status` state was being updated to 'calibrating-neutral', the callback still saw the stale 'idle' value and never entered the calibration logic.

### Fix Applied
Added a ref to track the current status:
```typescript
const statusRef = useRef<HeadTrackingStatus>(status)
statusRef.current = status  // Updated on every render

const onResults = useCallback((results) => {
  const currentStatus = statusRef.current  // Always reads latest value
  // ... rest of callback uses currentStatus instead of status
}, [onMoveLeft, onMoveRight, onDrop, onDirectionDetected])
```

---

## Prompt 6: Left/Right Detection Inverted

### User Prompt
> "The detection's really a bit weird. I mean, it seems to be detecting it, and maybe there is a little bit of flashing, but the arrow is pointing left, and when I basically move my head facing left, it doesn't work. I need to actually face it right to actually trigger it. I think the arrows are pointing to the wrong place, or it's very confusing because the arrows say it's pointing left, and I face left, and it's not doing it. The only assault recognises when I actually face right, even though the arrow is pointing left."

### Problem
The UI showed an arrow pointing left, but the user had to tilt their head RIGHT to trigger "left detected". Detection was backwards.

### Root Cause
The video preview is mirrored (`transform: scale-x-[-1]`) to create a natural selfie-like experience. However, the pose detection was using raw camera coordinates:
- When user tilts head left (as they see themselves in mirror), the camera sees them tilting right
- The yaw calculation wasn't accounting for the mirror effect

### Fix Applied
Inverted the yaw calculation in `pose-calculator.ts`:
```typescript
// Before:
const yaw = Math.max(-1, Math.min(1, yawOffset * 8))

// After (inverted):
const yaw = Math.max(-1, Math.min(1, -yawOffset * 8))
```

Now left/right directions match what the user sees in the mirrored video preview.

---

## Final State

The head tracking feature now works with:
- Interactive 4-step calibration (neutral → left → right → down)
- Visual feedback at each step (arrows, checkmarks, progress indicators)
- Correct left/right detection matching the mirrored video
- Game only starts after clicking "Start Game" button post-calibration
- Camera preview displayed during gameplay with status indicator

### Key Files Modified/Created
```
src/
  lib/
    headtracking/
      types.ts          # HeadPose, HeadTrackingStatus types
      pose-calculator.ts # Pure pose calculation functions
    types.ts            # Added 'classic-experimental' to GameMode
    constants.ts        # Added HEAD_TRACKING_CONFIG
  hooks/
    useHeadTracking.ts  # Core head tracking hook
  components/
    headtracking/
      CameraPreview.tsx      # Small video preview
      CalibrationOverlay.tsx # Full-screen calibration UI
    game/
      Game.tsx          # Integration and calibration flow
      ModeSelect.tsx    # Added new mode option
      Controls.tsx      # Added flash animation prop
```

---

## Lessons Learned

1. **Video element timing:** When using refs to access DOM elements for camera streams, ensure the element is mounted before accessing it. Consider using callback refs or explicit initialization triggers.

2. **Component lifecycle and streams:** MediaStreams attached to video elements are destroyed when the element unmounts. Keep video elements in a persistent parent component if the stream needs to survive child component unmounts.

3. **React closures in callbacks:** When registering callbacks with external libraries (like MediaPipe), the callback captures state values at registration time. Use refs (`useRef`) to always read the latest state value inside such callbacks.

4. **Mirrored video coordinate systems:** When displaying mirrored video (selfie-style), remember that coordinate systems are flipped. Either invert in the calculation or in the UI - pick one, not both.

5. **Interactive verification:** For input methods that may vary by user/environment (like head tracking), interactive calibration that verifies each action works is more robust than just capturing a baseline.
