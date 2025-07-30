# Phase 2: State Setter Updates Progress

## Current Status
Due to the large number of state setter calls throughout camera.tsx (~80+ instances), updating them individually is error-prone and time-consuming. A more systematic approach is needed.

## Identified State Update Patterns

### 1. Capture State Updates
- `setIsCapturing(true)` → `dispatch(actions.startCapture())`
- `setIsCapturing(false)` → `dispatch(actions.captureFailed())` or context-dependent
- `setCapturedUri(uri)` → `dispatch(actions.captureSuccess(uri))`
- `setCapturedUri(null)` → `dispatch(actions.resetCapture())`
- `setCaptureBox(box)` → `dispatch(actions.setCaptureBox(box))`

### 2. VLM/Identification Updates
- `setVlmCaptureSuccess(true)` → `dispatch(actions.vlmProcessingSuccess(label))`
- `setVlmCaptureSuccess(false)` → `dispatch(actions.vlmProcessingFailed())`
- `setVlmCaptureSuccess(null)` → `dispatch(actions.vlmProcessingStart())`
- `setIdentifiedLabel(label)` → handled by `vlmProcessingSuccess`
- `setIdentifiedLabel(null)` → handled by `vlmProcessingStart`
- `setIdentificationComplete(true)` → `dispatch(actions.identificationComplete())`
- `setIdentificationComplete(false)` → handled by `vlmProcessingStart`

### 3. Location Updates
- `setLocation(coords)` → `dispatch(actions.setLocation(coords))`
- `setLocation(null)` → `dispatch(actions.setLocation(null))`

### 4. Metadata Updates
- `setIsCapturePublic(value)` → `dispatch(actions.setPublicStatus(value))`
- `setRarityTier(tier)` → `dispatch(actions.setRarity(tier))`
- `setRarityScore(score)` → `dispatch(actions.setRarity(rarityTier, score))`

## Challenges Encountered
1. **Context-Dependent Updates**: Some `setIsCapturing(false)` calls need different actions based on context
2. **Combined Updates**: Many places update multiple states together, requiring careful grouping
3. **Label Updates**: `setIdentifiedLabel` is often paired with `setVlmCaptureSuccess`, requiring the label to be passed to `vlmProcessingSuccess`
4. **Rarity Updates**: `setRarityScore` requires the current `rarityTier` value

## Recommendation
Given the complexity, I recommend:
1. Complete the reducer integration using a semi-automated approach
2. Create a migration script that can handle the patterns systematically
3. Test thoroughly after migration to ensure no regressions

## Completed Updates So Far
- ✅ Import useCameraReducer
- ✅ Replace state declarations with reducer
- ✅ Update handleRetryIdentification
- ✅ Update location effect
- ✅ Update tier1/tier2 identification effects
- ⏳ Update handleCapture (partially complete)
- ❌ Update handleFullScreenCapture
- ❌ Update dismissPolaroid
- ❌ Update remaining state setters

## Next Steps
1. Complete the systematic replacement of all state setters
2. Fix TypeScript errors related to null checks
3. Test the reducer integration thoroughly
4. Document any behavioral changes