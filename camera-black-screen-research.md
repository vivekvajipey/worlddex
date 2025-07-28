# Expo Camera Black Screen Issues - Research Summary

## Overview
The black camera screen issue is a widespread problem affecting React Native and Expo applications, particularly on iOS devices. Through my research, I found this is a complex issue with multiple causes and varying solutions.

## Key Findings

### 1. iOS Permission Race Condition
**Most Common Issue**: On iOS, when a user grants camera permission for the first time, the camera shows a black screen. If the user closes and reopens the app, it works fine.

- **Affects**: iOS devices only (not Android or iOS simulator)
- **Cause**: Race condition between permission grant and camera initialization
- **When**: First time camera permission is requested
- **Solution**: Implement proper permission checking and delay camera rendering

### 2. iPhone 16 Pro + iOS 18 Bug (2024-2025)
**Device-Specific Issue**: A confirmed bug affecting iPhone 16 series running iOS 18.2+

- **Symptoms**: 
  - Black screen in camera, requiring 2-3 attempts to work
  - Primarily affects third-party apps
  - Camera works after device restart but issue returns
- **Affected Devices**: iPhone 16, iPhone 16 Pro, iPhone 16 Pro Max
- **iOS Versions**: 18.2, 18.3, 18.4
- **Workarounds**:
  - Restart device (temporary fix for ~1 day)
  - Downgrade to iOS 18.3.2 or earlier
  - Open app 2-3 times until camera works
- **Apple's Response**: Working on iOS 18.2.1 update to fix

### 3. Expo-Camera Version Issues
**Library-Specific Problems**: Various versions of expo-camera have exhibited black screen issues

- **expo-camera 16.0.3+**: Black screen after granting permissions
- **Solution**: Downgrade to expo-camera 16.0.10
- **Related**: Complete rewrite of expo-camera in SDK 51, legacy removed in SDK 52

### 4. React Native New Architecture
**SDK 52 Default Change**: New Architecture enabled by default may cause compatibility issues

- **When**: Projects created with SDK 52+
- **Solution**: Set `newArchEnabled: false` in app.json
- **Note**: Requires rebuild after change

## Developer Solutions & Workarounds

### 1. Permission Handling Pattern
```javascript
const [permission, requestPermission] = Camera.useCameraPermissions();

// Don't render camera until permission is explicitly granted
if (!permission?.granted) {
  return <PermissionRequestView />;
}

// Only render camera after permission is confirmed
return <Camera ... />;
```

### 2. Delayed Camera Initialization
```javascript
useEffect(() => {
  if (permission?.granted) {
    // Add delay for iOS camera system
    setTimeout(() => {
      setCanRenderCamera(true);
    }, 500); // 500ms-2000ms depending on device
  }
}, [permission?.granted]);
```

### 3. Device-Specific Delays
```javascript
// iPhone 16 models need longer delay
const isIPhone16 = Device.modelName?.includes('iPhone 16');
const delay = isIPhone16 ? 2000 : 100;
```

### 4. Camera Remounting Strategy
- Force remount camera component after permissions granted
- Use key prop to trigger remount
- Implement retry mechanism for failed initializations

## Additional Issues Found

### Recording Black Frames
- First 1-2 seconds of video recording may be black on iOS
- Affects iPhone 12+ models particularly
- Related to AVFoundation initialization timing

### Background App Interference
- Instagram and other apps running in background can trigger issue
- Camera Control button (iPhone 16) + Face ID can cause black screen

### Conditional Rendering Crashes
- Recent issue (#34957) where conditional rendering with CameraView crashes iOS apps
- Avoid conditional rendering patterns with camera components

## Recommended Approach

1. **Check Permissions Properly**
   - Ensure permissions are not just granted but fully resolved
   - Don't check just `permission.granted`, also check `permission.status !== null`

2. **Implement Delays**
   - Start with 100-500ms for general iOS devices
   - Use 2000ms+ for iPhone 16 series
   - Consider making delay configurable

3. **Version Management**
   - Consider using expo-camera 16.0.10 if issues persist
   - Test with New Architecture disabled
   - Monitor Expo SDK updates for fixes

4. **User Communication**
   - Inform users about the known issue
   - Provide retry mechanisms
   - Consider showing "initializing camera" message during delays

## Status
- **Expo**: Ongoing issue, no official fix yet
- **Apple**: Acknowledged iPhone 16/iOS 18 bug, fix expected in iOS 18.2.1
- **Community**: Various workarounds exist but no universal solution

This remains an active issue affecting many developers, with the community continuously discovering and sharing workarounds.