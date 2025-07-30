# Phase 2: State Reducer Architecture Plan

## Overview
Phase 2 focuses on consolidating the complex state management in camera.tsx using a reducer pattern. This will centralize state updates, make the component more predictable, and prepare for better testability.

## Current State Analysis

### State Variables to Consolidate (11 total)
1. **Capture Flow States**
   - `isCapturing`: boolean - Active capture status
   - `capturedUri`: string | null - URI of captured photo
   - `captureBox`: object - Lasso capture dimensions
   
2. **Location State**
   - `location`: {latitude, longitude} | null - User's location
   
3. **VLM/Identification States**
   - `vlmCaptureSuccess`: boolean | null - VLM processing result
   - `identifiedLabel`: string | null - Identified item label
   - `identificationComplete`: boolean - Both tier processing complete
   
4. **Capture Metadata States**
   - `isCapturePublic`: boolean - Public/private flag
   - `rarityTier`: enum - Rarity classification
   - `rarityScore`: number | undefined - Numeric rarity score

### Related State from Hooks
- Tutorial state (managed by useTutorialFlow)
- Capture limits (managed by useCaptureLimitsWithPersistence)
- Offline capture state (managed by useOfflineCapture)
- Modal sequence state (managed by useModalSequence)

## Reducer Architecture Design

### State Shape
```typescript
interface CameraState {
  // Capture flow
  capture: {
    isCapturing: boolean;
    uri: string | null;
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
      aspectRatio: number;
    };
  };
  
  // Location
  location: {
    latitude: number;
    longitude: number;
  } | null;
  
  // VLM/Identification
  identification: {
    vlmSuccess: boolean | null;
    label: string | null;
    isComplete: boolean;
  };
  
  // Metadata
  metadata: {
    isPublic: boolean;
    rarityTier: "common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary";
    rarityScore: number | undefined;
  };
}
```

### Action Types
```typescript
type CameraAction = 
  // Capture actions
  | { type: 'START_CAPTURE' }
  | { type: 'CAPTURE_SUCCESS'; payload: { uri: string; box?: CaptureBox } }
  | { type: 'CAPTURE_FAILED' }
  | { type: 'RESET_CAPTURE' }
  | { type: 'SET_CAPTURE_BOX'; payload: CaptureBox }
  
  // Location actions
  | { type: 'SET_LOCATION'; payload: { latitude: number; longitude: number } | null }
  
  // VLM/Identification actions
  | { type: 'VLM_PROCESSING_START' }
  | { type: 'VLM_PROCESSING_SUCCESS'; payload: { label: string } }
  | { type: 'VLM_PROCESSING_FAILED' }
  | { type: 'IDENTIFICATION_COMPLETE' }
  | { type: 'RESET_IDENTIFICATION' }
  
  // Metadata actions
  | { type: 'SET_PUBLIC_STATUS'; payload: boolean }
  | { type: 'SET_RARITY'; payload: { tier: RarityTier; score?: number } }
  | { type: 'RESET_METADATA' }
  
  // Global reset
  | { type: 'RESET_ALL' };
```

## Implementation Plan

### Step 1: Create the Reducer Hook
- Create `src/hooks/useCameraReducer.ts`
- Implement reducer function with all action handlers
- Add helper functions for common action dispatches
- Include middleware for logging in dev mode

### Step 2: Create Action Creators
- Create typed action creator functions
- Add validation for action payloads
- Include error boundaries for invalid actions

### Step 3: Integration Strategy
- Replace individual useState calls incrementally
- Maintain backward compatibility during transition
- Update all state setters to use dispatch
- Ensure all existing functionality remains intact

### Step 4: Testing Strategy
1. **Unit Tests for Reducer**
   - Test each action type
   - Test state transitions
   - Test edge cases and invalid actions

2. **Integration Tests**
   - Test reducer integration with camera.tsx
   - Test state persistence across re-renders
   - Test performance impact

3. **Manual Testing Checklist**
   - All capture flows work correctly
   - State updates are synchronized
   - No regressions in existing features

## Benefits of This Approach

1. **Centralized State Logic**: All state updates in one place
2. **Predictable Updates**: Clear action → state mapping
3. **Better Debugging**: Action log for state changes
4. **Easier Testing**: Pure reducer function is simple to test
5. **Performance**: Fewer re-renders with batched updates
6. **Type Safety**: Strongly typed actions and state

## Risk Assessment

### Medium Risk Areas
- State synchronization during transition
- Maintaining existing functionality
- Performance impact of reducer

### Mitigation Strategies
- Incremental migration approach
- Comprehensive test coverage
- Performance monitoring
- Easy rollback capability

## Success Criteria
1. All state management consolidated into reducer
2. No regressions in functionality
3. Improved code readability
4. All tests passing
5. Performance metrics maintained or improved

## Next Steps
1. Create useCameraReducer hook
2. Write comprehensive unit tests
3. Integrate incrementally into camera.tsx
4. Manual testing of all flows
5. Document any issues or learnings