# Camera.tsx Refactoring Report - Phase 1

## Overview
This report documents the completion of Phase 1 of the camera.tsx refactoring project. The goal was to extract self-contained logic into custom hooks to reduce component complexity and improve maintainability.

## Original State
- **File Size**: ~1300 lines
- **State Variables**: 20+ individual useState calls
- **Major Issues**:
  - Monolithic component handling camera, VLM processing, offline storage, tutorials, and database operations
  - Complex async flows with nested try/catch blocks
  - Duplicate code between lasso and full-screen capture methods
  - Tightly coupled business logic and UI concerns

## Phase 1 Accomplishments

### Custom Hooks Created

1. **useCaptureLimits** (`src/hooks/useCaptureLimits.ts`)
   - Manages daily capture limit checking (10/day)
   - Provides reusable `checkCaptureLimit()` function
   - Shows appropriate alert when limit reached

2. **useTutorialFlow** (`src/hooks/useTutorialFlow.ts`)
   - Handles tutorial overlay display for new users
   - Manages idle timer detection (8 seconds)
   - Controls progressive onboarding modals (at 3 and 10 captures)
   - Provides PanResponder for touch interaction tracking

3. **useOfflineCapture** (`src/hooks/useOfflineCapture.ts`)
   - Centralizes offline capture storage logic
   - Handles saving images locally when network unavailable
   - Manages offline save state and progress tracking
   - Integrates with PostHog analytics

4. **useCaptureProcessing** (`src/hooks/useCaptureProcessing.ts`)
   - Extracts image processing logic for both capture types
   - Handles lasso point calculations and cropping
   - Manages full-screen capture dimensions
   - Prepares images for VLM processing

5. **useModalSequence** (`src/hooks/useModalSequence.ts`)
   - Manages post-capture modal queueing
   - Handles XP and coin calculations
   - Controls modal priority (level up > rewards > location)
   - Manages location permission prompts

## Changes Made to camera.tsx

### Removed
- Tutorial overlay state management (3 state variables, 3 refs, 3 useEffects)
- Idle timer implementation (~50 lines)
- Offline save duplicate code in multiple locations
- Manual capture limit checking logic
- Some unused imports and variables

### Added
- Clean hook imports and initialization
- Simplified capture handlers using new hooks
- Centralized offline capture handling

### Kept (Intentionally)
- Core capture flow to maintain functionality
- VLM identification logic
- Database operations (for now)
- Modal queueing implementation (to ensure it works before removing)

## Results

### Positive Outcomes
- **Better Organization**: Related logic is now grouped in dedicated hooks
- **Reusability**: Hooks can be used in other components if needed
- **Testability**: Each hook can be unit tested in isolation
- **Separation of Concerns**: UI logic more separated from business logic

### Current Limitations
- **File Size**: Only reduced from ~1300 to ~1000 lines (23% reduction)
- **Code Duplication**: Still exists between capture methods
- **State Management**: Still using 15+ individual state variables
- **Complexity**: `handleDismissPreview` remains 300+ lines

## Why Limited Size Reduction?

1. **Conservative Approach**: We kept the original implementation alongside hook usage to ensure nothing breaks
2. **Duplicate Logic**: The two capture methods still contain similar code
3. **State Sprawl**: Individual state variables not yet consolidated
4. **Database Operations**: Collection updates, XP/coin awards still inline

## Next Steps (Phase 2-5)

### Phase 2: State Reducer
- Consolidate 20+ state variables into a single reducer
- Create actions for state transitions
- Estimated impact: -200 lines

### Phase 3: Component Extraction  
- Extract CaptureHandler component
- Extract PostCaptureProcessor component
- Estimated impact: -300 lines

### Phase 4: Consolidate Capture Methods
- Merge handleCapture and handleFullScreenCapture
- Use strategy pattern for differences
- Estimated impact: -200 lines

### Phase 5: Error Boundaries
- Create proper error handling components
- Remove inline try/catch blocks
- Estimated impact: -100 lines

## Recommendations

1. **Continue with Phase 4 first** - Consolidating capture methods will provide the most immediate impact
2. **Add unit tests** for the new hooks before proceeding
3. **Consider feature flags** for gradual rollout
4. **Monitor performance** metrics after each phase

## Testing Checklist

- [x] Lasso capture still works
- [x] Full screen capture still works  
- [x] Daily limits enforced
- [x] Tutorial shows for new users
- [x] Offline captures save correctly
- [x] All imports resolved
- [ ] Unit tests for new hooks
- [ ] Integration tests for capture flow
- [ ] Performance benchmarks

## Conclusion

Phase 1 successfully extracted reusable logic into custom hooks, improving code organization and setting the foundation for further refactoring. While the size reduction was modest (23%), the architectural improvements enable more aggressive refactoring in subsequent phases. The code is now better organized and more testable, with clear separation between different concerns.