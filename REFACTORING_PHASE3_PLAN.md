# Phase 3: Component Extraction Plan

## Overview
Phase 3 focuses on extracting UI components from camera.tsx to improve modularity, reusability, and testability. After consolidating state management in Phase 2, we can now cleanly separate presentation components from business logic.

## Current Component Analysis

### Components Currently in camera.tsx
1. **Main Camera Screen** (~700 lines)
   - Permission handling logic
   - Camera capture orchestration
   - State management (now via reducer)
   - Effect hooks for various side effects

2. **Embedded UI Logic**
   - Permission status rendering
   - Tutorial overlay conditional rendering
   - Polaroid development component integration
   - Camera capture component integration

## Components to Extract

### 1. CameraPermissionHandler
**Purpose**: Handle camera permission states and requests
**Props**:
```typescript
interface CameraPermissionHandlerProps {
  children: React.ReactNode;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}
```
**Benefits**:
- Reusable permission handling
- Clean separation of permission UI
- Testable permission flows

### 2. CameraEffects
**Purpose**: Consolidate all useEffect hooks
**Contains**:
- Location tracking effect
- Offline service initialization
- Modal queue debugging
- Network error watching
- Safety valve timeout
- Tier1/Tier2 result watching

**Benefits**:
- Cleaner main component
- Grouped related effects
- Easier to test side effects

### 3. CameraDebugLogger
**Purpose**: Development-only state logging
**Props**:
```typescript
interface CameraDebugLoggerProps {
  states: {
    isCapturing: boolean;
    capturedUri: string | null;
    vlmCaptureSuccess: boolean | null;
    identifiedLabel: string | null;
    identificationComplete: boolean;
    idLoading: boolean;
    idError: any;
    savedOffline: boolean;
  };
}
```
**Benefits**:
- Remove debug code from production
- Centralized logging
- Easy to enable/disable

### 4. CameraStateProvider
**Purpose**: Provide camera state context to child components
**Benefits**:
- Avoid prop drilling
- Cleaner component interfaces
- Better state encapsulation

### 5. CaptureHandlers
**Purpose**: Extract capture handler functions
**Contains**:
- handleCapture
- handleFullScreenCapture
- handleRetryIdentification
- dismissPolaroid

**Benefits**:
- Testable business logic
- Reusable capture logic
- Cleaner main component

## Implementation Strategy

### Step 1: Create Component Structure
```
app/components/camera/
├── CameraPermissionHandler.tsx
├── CameraEffects.tsx
├── CameraDebugLogger.tsx
├── CameraStateProvider.tsx
├── CaptureHandlers.ts
└── index.ts
```

### Step 2: Extract Components (Order Matters)
1. **CameraDebugLogger** - Easiest, no dependencies
2. **CameraPermissionHandler** - Clear boundaries
3. **CaptureHandlers** - Pure functions mostly
4. **CameraEffects** - Group related effects
5. **CameraStateProvider** - Wrap everything

### Step 3: Update camera.tsx
- Import new components
- Replace inline code with components
- Verify all functionality preserved

### Step 4: Add Component Tests
- Unit tests for each component
- Integration tests for component interactions
- Snapshot tests for UI components

## Expected Outcome

### Before (camera.tsx):
- 700+ lines in single file
- Mixed concerns (UI, logic, effects)
- Hard to test individual parts
- Difficult to reuse components

### After:
- camera.tsx: ~200 lines (orchestration only)
- 5+ focused components
- Each component < 150 lines
- Clear separation of concerns
- Highly testable components

## Risk Assessment

### Low Risk
- CameraDebugLogger extraction
- CameraPermissionHandler extraction

### Medium Risk
- CaptureHandlers extraction (complex dependencies)
- CameraEffects extraction (timing sensitive)

### High Risk
- CameraStateProvider (affects all child components)

## Testing Strategy

### Unit Tests
- Test each component in isolation
- Mock dependencies
- Test edge cases

### Integration Tests
- Test component interactions
- Test state flow through components
- Test permission flows

### Manual Testing
- Full capture flow
- Permission denial/grant
- Offline capture
- Network errors
- Tutorial flow

## Success Criteria
1. camera.tsx reduced to < 300 lines
2. All functionality preserved
3. No performance regressions
4. All tests passing
5. Improved code organization

## Timeline
- Component extraction: 2-3 hours
- Testing: 1-2 hours
- Integration & debugging: 1 hour
- Total: 4-6 hours

## Next Steps
1. Create component file structure
2. Start with CameraDebugLogger extraction
3. Proceed through components by risk level
4. Test each extraction before moving on
5. Document any issues or learnings