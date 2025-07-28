# Permission System Testing Guide

## Testing Setup

### Reset App State (Between Tests)
```bash
# Delete app from simulator/device to clear all permissions and storage
# OR use Settings > General > Reset > Reset Location & Privacy
```

## 1. Camera Permission Testing

### Test 1.1: First Time User
1. Fresh install app
2. Navigate to camera screen
3. **Expected**: See placeholder with "Ready to explore the world?"
4. Tap "Enable Camera"
5. **Expected**: iOS permission dialog appears immediately
6. Allow permission
7. **Expected**: Camera view loads

### Test 1.2: Permission Denied
1. Fresh install app
2. Navigate to camera screen
3. Tap "Enable Camera"
4. **Deny** iOS permission
5. **Expected**: Placeholder changes to "Camera access needed" with "Open Settings" button
6. Tap "Open Settings"
7. **Expected**: iOS Settings app opens

### Test 1.3: Permission Previously Granted
1. With camera permission already granted
2. Navigate to camera screen
3. **Expected**: Camera loads immediately, no placeholder

## 2. Location Permission Testing

### Test 2.1: First Capture
1. Grant camera permission
2. Make a capture
3. Wait for identification to complete
4. **Expected**: After ~2 seconds, location prompt appears
5. **Expected**: Shows "Nice! You captured [item name]"
6. Tap "Enable Location"
7. **Expected**: iOS location permission dialog
8. Allow permission
9. **Expected**: Success message "Location Enabled!"

### Test 2.2: Skip Location
1. Make a capture
2. When location prompt appears, tap "Skip for Now"
3. **Expected**: Prompt closes, no iOS dialog
4. Make another capture
5. **Expected**: Location prompt appears again (because permission not granted)

### Test 2.3: Location Already Granted
1. With location permission already granted
2. Make a capture
3. **Expected**: NO location prompt appears
4. Check console logs for "Location permission already granted, skipping prompt"

### Test 2.4: Multiple Modals
1. Make a capture that triggers XP/coins
2. **Expected**: Coin/XP modal appears first
3. **Expected**: Location prompt appears 2 seconds after dismissing coin modal

## 3. Notification Permission Testing

### Test 3.1: Trigger by Captures
1. Fresh user account
2. Make 2 captures
3. **Expected**: No notification prompt yet
4. Make 3rd capture
5. **Expected**: Within 1 minute, notification primer appears
6. Check console for "Notification trigger check" logs

### Test 3.2: Trigger by Time
1. Create account but don't make 3 captures
2. Wait 2 days (or manually adjust date in simulator)
3. Open app
4. **Expected**: Notification primer appears within 1 minute

### Test 3.3: Primer Allow Flow
1. When notification primer appears
2. Tap "Enable Notifications"
3. **Expected**: iOS notification permission dialog
4. Allow permission
5. **Expected**: Success alert "Notifications Enabled! 🎉"

### Test 3.4: Primer Deny Flow
1. When notification primer appears
2. Tap "Maybe Later"
3. **Expected**: Primer closes, no iOS dialog
4. Close and reopen app
5. **Expected**: Primer does NOT appear again immediately
6. Wait 14 days (or adjust date)
7. **Expected**: Primer can appear again

### Test 3.5: Already Has Permission
1. With notifications already enabled
2. Make 3+ captures
3. **Expected**: No primer appears

## 4. Edge Cases to Test

### 4.1: Rapid Navigation
1. Tap "Enable Camera" then immediately navigate away
2. **Expected**: No crashes, permission dialog handled gracefully

### 4.2: Background/Foreground
1. Trigger location prompt
2. Background the app before responding
3. Foreground the app
4. **Expected**: Prompt still visible and functional

### 4.3: Multiple Captures Quickly
1. Make multiple captures in quick succession
2. **Expected**: Location prompt only appears once at a time
3. **Expected**: No duplicate prompts

### 4.4: Offline Behavior
1. Go offline
2. Make a capture (saved offline)
3. **Expected**: No location prompt (since capture isn't uploaded)

## 5. Console Logging to Monitor

Add these logs to verify behavior:

```javascript
// In useNotificationTrigger.ts
console.log('Notification trigger check:', {
  captureCount,
  daysSinceJoined,
  hasEnoughCaptures,
  hasBeenLongEnough,
  hasBeenPrompted: triggerData.hasBeenPrompted
});

// In camera.tsx
console.log("Location permission check:", {
  locationPermissionStatus: locationPermission?.status,
  locationPermissionGranted: locationPermission?.granted,
  hasLocation: !!location,
  identifiedLabel
});
```

## 6. Testing Tools

### iOS Simulator Tips
- **Reset Permissions**: Settings > General > Reset > Reset Location & Privacy
- **Change Date**: Settings > General > Date & Time (turn off auto, change date)
- **Delete App Data**: Long press app icon > Remove App > Delete App

### Test User Accounts
Create multiple test accounts to test different scenarios:
- New user with 0 captures
- User with 2 captures (just under threshold)
- User with 10+ captures
- User created 1 day ago
- User created 3+ days ago

## 7. Automated Test Scenarios

### Scenario A: Perfect New User Flow
1. Install app → Sign up
2. Go to camera → Enable camera
3. Make first capture → Skip location
4. Make second capture → Enable location  
5. Make third capture → Get notification prompt → Enable
6. **Result**: All permissions granted through positive experience

### Scenario B: Cautious User Flow
1. Install app → Sign up
2. Go to camera → Enable camera
3. Make captures → Skip location every time
4. See notification primer → Tap "Maybe Later"
5. Use app for 2 weeks
6. See notification primer again → Enable this time
7. **Result**: User granted permissions when ready

## 8. Bug Checklist

- [ ] Camera placeholder appears when permission not granted
- [ ] Camera loads immediately when permission already granted
- [ ] Location prompt appears after ANY successful capture (not just first)
- [ ] Location prompt has 2-second delay to avoid modal conflicts
- [ ] Notification primer appears after 3 captures OR 2 days
- [ ] Notification primer respects 14-day cooldown after soft denial
- [ ] All permission states persist across app restarts
- [ ] No duplicate prompts or modals
- [ ] Settings redirect works for hard denials
- [ ] Console logs show expected trigger checks

## 9. Performance Testing

1. Monitor memory usage during permission flows
2. Check for any delays in camera initialization
3. Verify AsyncStorage operations don't block UI
4. Ensure notification checks don't impact app performance

## Common Issues to Watch For

1. **Modal Stacking**: Multiple modals trying to show at once
2. **State Persistence**: Permissions not remembered after app restart
3. **Timing Issues**: Prompts appearing too early/late
4. **Navigation Bugs**: Prompts appearing on wrong screens
5. **Memory Leaks**: From event listeners or intervals