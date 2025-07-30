# Phase 1 Testing Checklist

## Prerequisites
- [x] Ensure the app builds successfully
- [x] Have a test account ready
- [x] Clear app data/cache for fresh testing
- [x] Enable airplane mode for offline testing

## Core Camera Functionality

### Lasso Capture
- [x] Open camera screen
- [x] Draw lasso around an object
- [x] Verify photo is captured
- [x] Verify polaroid animation plays
- [x] Verify object is identified correctly
- [x] Verify capture is saved to database

### Full Screen Capture
- [x] Open camera screen
- [x] Double tap for full screen capture
- [x] Verify photo is captured
- [x] Verify polaroid animation plays
- [x] Verify scene is identified
- [x] Verify capture is saved to database

## Capture Limits Testing

### Daily Limit Enforcement
- [x] Create test user with 9 captures
- [x] Take 1 capture successfully
- [x] Attempt 11th capture
- [x] Verify "Daily Limit Reached" alert shows
- [x] Verify alert message mentions "10 daily captures"
- [x] Verify alert mentions "midnight PST"
- [x] Verify capture is blocked

### Limit Reset
- [ ] Wait until midnight PST (or manually update DB)
- [ ] Verify captures are allowed again
- [ ] Verify counter resets to 0

## Tutorial Flow Testing

### New User Experience
- [ ] Create fresh account
- [ ] Navigate to camera
- [ ] Verify tutorial overlay appears
- [ ] Verify overlay explains lasso gesture
- [ ] Take first capture
- [ ] Verify tutorial disappears
- [ ] Verify user marked as onboarded

### Idle Timer (Onboarded Users)
- [ ] Use onboarded account
- [ ] Open camera screen
- [ ] Wait 8 seconds without interaction
- [ ] Verify tutorial nudge appears
- [ ] Touch screen
- [ ] Verify tutorial disappears
- [ ] Verify timer resets

### Progressive Onboarding
- [ ] Take 3 captures total
- [ ] Verify circle tutorial modal appears
- [ ] Dismiss modal
- [ ] Take 7 more captures (10 total)
- [ ] Verify swipe tutorial modal appears
- [ ] Verify modals don't reappear

## Offline Capture Testing

### Network Error During Identification
1. **Setup**
   - [ ] Enable airplane mode
   - [ ] Open camera screen
   
2. **Lasso Capture Test**
   - [ ] Draw lasso around object
   - [ ] Verify polaroid shows "Identifying..."
   - [ ] Wait for timeout (~15s)
   - [ ] Verify "Saved for Later" alert appears
   - [ ] Verify capture saved locally

3. **Full Screen Capture Test**
   - [ ] Long press for full capture
   - [ ] Verify same offline flow
   - [ ] Verify "Saved for Later" alert

4. **Verification**
   - [ ] Check AsyncStorage for pending captures
   - [ ] Check file system for saved images
   - [ ] Verify PostHog event: "offline_capture_saved"

### Auto-Dismiss Detection
- [ ] Start capture with network
- [ ] Disable network mid-identification
- [ ] Verify polaroid auto-dismisses
- [ ] Verify offline save triggered

### Offline Save Limits
- [ ] Save 49 offline captures
- [ ] Attempt 51st capture
- [ ] Verify error about maximum pending captures

## Image Processing Testing

### Lasso Processing
- [ ] Draw very small lasso (< 5px)
- [ ] Verify "Selection area too small" error
- [ ] Draw lasso at screen edge
- [ ] Verify proper edge clamping
- [ ] Draw complex polygon shape
- [ ] Verify accurate crop

### Aspect Ratio Handling
- [ ] Capture tall objects (portrait)
- [ ] Capture wide objects (landscape)
- [ ] Verify polaroid dimensions adjust correctly
- [ ] Verify no image distortion

## Integration Testing

### State Synchronization
- [ ] Start capture
- [ ] Verify camera freezes during processing
- [ ] Verify all UI updates correctly
- [ ] Cancel capture (X button)
- [ ] Verify camera unfreezes
- [ ] Verify state resets properly

### Error Recovery
- [ ] Trigger VLM timeout
- [ ] Verify error state in polaroid
- [ ] Use retry button
- [ ] Verify retry works correctly
- [ ] Verify duplicate prevention

### Memory Management
- [ ] Take 10 captures in succession
- [ ] Monitor memory usage
- [ ] Verify no memory leaks
- [ ] Verify old images cleaned up

## Modal Queue Testing

### Priority Order
1. Take capture that triggers:
   - [ ] Level up
   - [ ] Coin rewards
   - [ ] Location prompt
2. Verify modals appear in order:
   - [ ] Level up first (priority 100)
   - [ ] Coins second (priority 50)
   - [ ] Location last (priority 10)

### Persistence
- [ ] Trigger location prompt
- [ ] Navigate away without dismissing
- [ ] Return to camera
- [ ] Verify location prompt still shows

## Edge Cases

### Rapid Actions
- [ ] Tap capture multiple times quickly
- [ ] Verify no duplicate captures
- [ ] Switch capture modes rapidly
- [ ] Verify no crashes

### Permission Handling
- [ ] Deny camera permission
- [ ] Verify placeholder shows
- [ ] Grant permission
- [ ] Verify camera activates
- [ ] Same for location permission

### Background/Foreground
- [ ] Start capture
- [ ] Background app
- [ ] Return to app
- [ ] Verify state preserved correctly

## Performance Testing

### Capture Speed
- [ ] Time from lasso release to polaroid
- [ ] Should be < 500ms
- [ ] Time to identification result
- [ ] Should be < 5s typical

### UI Responsiveness
- [ ] Verify 60 FPS during camera preview
- [ ] Verify smooth lasso drawing
- [ ] Verify smooth polaroid animations
- [ ] No jank during state updates

## Regression Testing

### Existing Features
- [ ] Collections still update
- [ ] XP/coins still awarded
- [ ] Rarity tiers display correctly
- [ ] Public/private toggle works
- [ ] Accept/reject buttons work

### Database Operations
- [ ] Captures save with correct data
- [ ] User stats update properly
- [ ] Collection items link correctly
- [ ] No orphaned records

## Known Issues to Verify Fixed

- [ ] No duplicate offline saves
- [ ] No stuck "capturing" state
- [ ] Tutorial doesn't show for onboarded users
- [ ] Proper TypeScript types (no errors)

## Post-Testing Cleanup

- [ ] Clear test data
- [ ] Reset user accounts
- [ ] Document any bugs found
- [ ] Create tickets for issues

---

## Testing Results Summary

**Date**: ___________
**Tester**: ___________
**Version**: Phase 1 Refactor

### Statistics
- Total Tests: 85
- Passed: ___
- Failed: ___
- Blocked: ___

### Critical Issues Found
1. 
2. 
3. 

### Notes