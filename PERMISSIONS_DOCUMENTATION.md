# WorldDex App Permissions Documentation

## Overview
This document provides a comprehensive analysis of all permissions required by the WorldDex app and their specific use cases within the application.

## iOS Permissions (Info.plist)

### 1. Camera Permission
- **Key**: `NSCameraUsageDescription`
- **Message**: "WorldDex needs access to your camera to take pictures"
- **Usage**: 
  - Primary functionality for capturing images in `app/(screens)/camera.tsx`
  - Used with expo-camera to enable the main capture feature
  - Required for both lasso selection and full-screen capture modes

### 2. Photo Library Read Permission
- **Key**: `NSPhotoLibraryUsageDescription`
- **Message**: "WorldDex needs access to your photo library to save pictures"
- **Usage**:
  - Currently only requested but NOT actively used for saving photos
  - Used by ImagePicker in collection creation (`CreateCollectionScreen.tsx`) and adding collection items (`AddCollectionItemsScreen.tsx`)
  - Used in profile photo selection (`Profile.tsx`)

### 3. Photo Library Add Permission
- **Key**: `NSPhotoLibraryAddUsageDescription`
- **Message**: "WorldDex needs permission to save photos to your library"
- **Usage**:
  - Currently requested but NOT implemented - no code calls `MediaLibrary.saveToLibraryAsync()` or similar
  - Permission exists but functionality not utilized

### 4. Location When In Use Permission
- **Key**: `NSLocationWhenInUseUsageDescription`
- **Message**: "Allow WorldDex to access your location to tag where your captures were taken"
- **Usage**:
  - Used in `camera.tsx:200-220` to get current location when capturing
  - Location data sent with captures for geographical context
  - Uses `Location.getCurrentPositionAsync()` with balanced accuracy

### 5. Location Always Permission
- **Key**: `NSLocationAlwaysAndWhenInUseUsageDescription`
- **Message**: "Allow WorldDex to access your location to tag where your captures were taken"
- **Usage**:
  - Currently requested but app only uses foreground location services
  - No background location tracking implemented

### 6. Background Modes
- **Key**: `UIBackgroundModes`
- **Value**: `["remote-notification"]`
- **Usage**:
  - Enables background processing of push notifications
  - Required for notification scheduling functionality

## Android Permissions

### 1. Camera Permission
- **Permissions**: `CAMERA`, `android.permission.CAMERA`
- **Usage**: Same as iOS - core capture functionality

### 2. Storage Permissions
- **Permissions**: 
  - `READ_EXTERNAL_STORAGE`, `android.permission.READ_EXTERNAL_STORAGE`
  - `WRITE_EXTERNAL_STORAGE`, `android.permission.WRITE_EXTERNAL_STORAGE`
- **Usage**:
  - Required for expo-file-system operations in `offlineCaptureService.ts`
  - Used to store pending captures locally when offline
  - Stores images in app's document directory for offline functionality

### 3. Media Location Permission
- **Permission**: `android.permission.ACCESS_MEDIA_LOCATION`
- **Usage**:
  - Allows access to location metadata in media files
  - Configured in expo-media-library plugin settings

### 4. Audio Recording Permission
- **Permission**: `android.permission.RECORD_AUDIO`
- **Usage**:
  - Currently NOT used in the codebase
  - No audio recording functionality implemented
  - **Recommendation**: Remove this permission as it's unused

### 5. Notification Permissions
- **Permissions**: `NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`
- **Usage**:
  - Used by `NotificationService.ts` for daily reminders
  - Schedules random daily notifications between 9 AM and 8 PM
  - Requested on app launch in `_layout.tsx`

## Permission Request Flow

### 1. Camera & Media Library
- Requested when user accesses camera screen
- Both must be granted before camera functionality is available
- Handled in `camera.tsx:932-958`

### 2. Location
- Requested after camera permission is granted
- Optional - app continues without location if denied
- Location errors are handled gracefully

### 3. Notifications
- Requested on app launch in `_layout.tsx:115-123`
- If granted, schedules daily notifications automatically
- User can function without notifications

### 4. Image Picker
- Requests media library permission on-demand when:
  - Creating a collection cover image
  - Adding silhouettes to collection items
  - Selecting profile photo

## Offline Functionality
The app uses expo-file-system to store captures locally when offline:
- Images saved to `${FileSystem.documentDirectory}pending_captures/`
- Metadata stored in AsyncStorage
- No external storage access needed - uses app's sandboxed storage

## Security Considerations

1. **Location Data**: Location is only captured at the moment of photo capture, not continuously tracked
2. **Storage**: All file operations use app's sandboxed directories, not accessing external storage
3. **Unused Permissions**: 
   - Audio recording permission should be removed
   - Photo library save permission not implemented

## Recommendations

1. **Remove Unused Permissions**:
   - Remove `android.permission.RECORD_AUDIO` 
   - Consider removing photo library add/save permissions until save functionality is implemented

2. **Clarify Permission Messages**:
   - Update photo library permission messages to reflect actual usage (selecting images, not saving)

3. **Implement Missing Features**:
   - If photo saving is planned, implement the MediaLibrary save functionality
   - Otherwise, remove the unused permissions

4. **Location Permissions**:
   - Consider removing "Always" location permission since only foreground location is used