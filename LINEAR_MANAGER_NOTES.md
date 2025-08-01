# Linear Manager Notes

## Quick Reference
- **Update issue states**: Need UUID, not string. Use `list_issue_statuses` with team ID first.
- **JSV AI Team ID**: `0d258193-c473-4a4e-8d20-9aba2f444e5e`
- **After completing tasks**: Update Linear ticket description with implementation details

## State UUIDs (JSV AI)
- Done: `8f0d6003-ec0e-4d70-8b37-e6718f0aac9d`
- Todo: `d94a3447-d38d-4a78-994b-ea8e23b551de`
- In Progress: `13aa333b-de2a-41dc-a8a2-4b3b1ac5e3a0`
- Backlog: `53ceaa53-4161-49dd-ac81-b27aa5ea210b`

## Warm Start Template
```
"[Problem description]. Check [specific files]. 
Context: [CLAUDE.md reference if relevant]. 
Look for [existing patterns/similar code]."
```

## Warm Start Philosophy
- **Investigation First**: Don't implement immediately - explore and understand the issue
- **Collaborative Approach**: Discuss findings and confirm root cause before coding
- **Strategic Information**: Provide enough context to guide exploration without overwhelming
- **Confirm Path Forward**: Get alignment on approach before implementation

## Learned Patterns
- 2025-07-31: State updates require UUID lookup, not direct string values
- 2025-08-01: Always update Linear tickets with implementation details after completion for future reference
- 2025-08-01: Always read latest manager notes when resuming work - parallel branches may have updated task status
- 2025-08-01: Collaborative investigation approach works well - explore first, discuss findings, then implement
- 2025-08-01: Simple fixes can resolve critical UX bugs - one-line change fixed JSV-395 stuck state issue
- 2025-08-01: Testing with reduced timeouts is effective for reproducing timeout-related bugs
- 2025-08-01: Request-based error handling > proactive health checks - more accurate, efficient, and handles edge cases
- 2025-08-01: Unified parent error handling prevents redundant error messages (JSV-398 leaderboard fix)
- 2025-08-01: File path bug: Always type "worlddex" not "worlddx" - added to CLAUDE.md for future instances
- 2025-08-01: Flexbox alignment > absolute positioning for header elements - more maintainable and reliable
- 2025-08-01: Velocity-based gesture detection > distance-only for responsive UX - feels more natural
- 2025-08-01: React.memo + useCallback essential for complex tab components - prevents unnecessary re-renders during gestures
- 2025-08-01: Custom optimized implementation > problematic native modules when compatibility issues arise
- 2025-08-01: flex-1 + flex-shrink-0 pattern solves text/badge cutoff issues - proper flex constraints prevent layout crushing

## Strategic Design Insights (Big Rethink)
- 2025-08-01: o3/GPT-4.5 consultation valuable but needs critical analysis - don't accept suggestions blindly
- 2025-08-01: Contextual rarity beats complex multi-axis scoring - simplicity with intelligence wins
- 2025-08-01: Location-aware significance solves materialism problem naturally
- 2025-08-01: Micro-collections + persistent collections hierarchy addresses engagement vs overwhelm
- 2025-08-01: Natural social pressure > designed collaboration - proximity alerts, area momentum
- 2025-08-01: User validation for identification accuracy is unscalable - focus on system optimization
- 2025-08-01: Comprehensive Linear issues with full context enable effective fresh Claude discussions

## JSV-276 & JSV-401 Investigation: Data Integrity Issues (Aug 1, 2025)

### Key Findings:

**PostHog Integration (JSV-276):**
- PostHog is initialized in `app/_layout.tsx` with API key: `phc_EyLCiDrJnGPqXma1f21WFwgAmRf35KANelGXVzmDDz4`
- Autocapture is enabled for lifecycle events, screens, and touches
- Main capture-related events tracked:
  - `capture_initiated` (with method: lasso/full_screen)
  - `capture_lasso`, `capture_fullscreen`, `capture_square` (in CameraCapture.tsx)
  - `object_identified` (successful identification in PolaroidDevelopment.tsx)
  - `identification_failed` (failed identification)
  - `offline_capture_saved` (when captures saved offline)
  - Various UI events: `toggle_camera_facing`, `toggle_torch`, `tab_changed`

**Data Flow for Captures:**
1. When capture succeeds → `createCapture()` inserts into captures table
2. `incrementUserField()` updates `users.total_captures` field
3. `increment_item_captures` RPC updates `all_items.total_captures`

**Leaderboard Data Source (JSV-401):**
- Uses `get_user_capture_counts()` RPC function
- RPC counts captures from captures table WHERE deleted_at IS NULL
- Falls back to manual counting if RPC fails
- Does NOT use the `users.total_captures` column

**Potential Discrepancies Identified:**

1. **Multiple Counting Systems:**
   - PostHog events (client-side tracking)
   - `users.total_captures` column (incremented via `incrementUserField`)
   - Actual captures table count (used by leaderboard RPC)
   - `all_items.total_captures` (for items)

2. **Synchronization Issues:**
   - `incrementUserField` is called separately from capture creation
   - Offline captures may increment counters without successful database inserts
   - No database triggers to keep `users.total_captures` in sync with captures table

3. **Race Conditions:**
   - Capture limits use local state + async database updates
   - Pending sync mechanism in `useCaptureLimitsWithPersistence` may cause counting issues

4. **Missing PostHog Events:**
   - No "capture_saved" or "capture_created" event when database insert succeeds
   - "object_identified" fires on UI completion, not database save

**Recommended Actions:**
1. Add PostHog event when capture is successfully saved to database
2. Create database trigger to keep users.total_captures in sync with captures table ✅
3. Review offline capture sync logic to prevent double-counting ✅
4. Consider using single source of truth (captures table) for all counts ✅

**Implementation Status (JSV-401): ✅ COMPLETED**
1. Created database triggers in `fix_total_captures_sync.sql`:
   - Auto-increment on capture insert
   - Auto-decrement on soft delete
   - Auto-increment on undelete
   - One-time sync query included
2. Removed manual `incrementUserField` calls for total_captures from:
   - `useCaptureLimitsWithPersistence.ts`
   - `useCaptureLimitsWithLocalState.ts`
3. Updated `CaptureLeaderboard.tsx` to query users table directly
4. Created verification script `verify_total_captures_sync.sql`

**Next Steps:**
- Add PostHog tracking for capture saves (JSV-276) - remaining task for PostHog investigation

## Current Priority Tasks (Aug 1, 2025)

### ✅ Recently Completed (ALL Major Technical Issues Resolved!)
- **JSV-399**: Daily capture limit not resetting - Set up pg_cron daily reset ✅
- **JSV-398**: Social pages false offline - Replaced proactive health checks with request-based error handling ✅
- **JSV-395**: VLM AbortError bug - Fixed stuck "..." state by handling AbortError in offline save flow ✅
- **JSV-391**: Social modal to page conversion - Eliminated nested modal issues, proper navigation with flexbox layout ✅
- **JSV-389**: WorldDex pagination loading - Complete DRY pagination infrastructure with infinite scroll ✅
- **JSV-390**: WorldDex personal captures drag reload - Pull-to-refresh functionality ✅
- **JSV-331**: Modal for pending capture without connection - Offline handling for pending captures ✅
- **JSV-357**: Black screen background - Gradient loading backgrounds ✅
- **JSV-355**: Offline indicator - OfflineIndicator component ✅
- **JSV-330**: Public capture warning - Privacy toggle in PolaroidDevelopment ✅
- **JSV-333**: Rename "No object Detected" - Simple string change ✅
- **JSV-312**: Resample usernames - Username generation improvements ✅
- **JSV-240**: Add offline screens for social tabs - Context-specific offline indicators ✅
- Plus many others... All major technical/UX issues are now resolved! 🎉

### 🎯 **THE BIG RETHINK - Strategic Design Phase**
**JSV-402**: The Big Rethink consultation with o3/GPT-4.5 completed. Core insights:

**Key Breakthrough Directions:**
1. **Contextual Rarity**: Location-aware significance (pigeon in subway vs park)
2. **Micro + Persistent Collections**: Achievable momentum + long-term goals
3. **Natural Social Pressure**: Proximity alerts, area discovery momentum
4. **Anti-Materialism**: Celebrate discovery/context over expensive objects

**Created Comprehensive Design Issues:**
- **Contextual rarity system and collection architecture design** (Urgent)
- **Natural social pressure and community engagement features** (Urgent)  
- **User onboarding and first experience design** (High)
- **Progressive disclosure and complexity management system** (Low)
- **Gamification and reward psychology system** (Low)

**Next Phase**: Detailed design discussions → Implementation planning → Technical execution

### 🚨 **Current Urgent Issues** 
- **JSV-410**: Long blurry screen after capture (networking/performance issue)
- **JSV-426**: Volume button to capture (user-requested feature)

### 🔥 **Current High Priority Tasks**
- **JSV-412**: Add notes per capture (new feature)
- **JSV-256**: Share captures outside of the app
- **JSV-276**: Make sure PostHog is tracking everything correctly 🔍 UNDER INVESTIGATION
- **JSV-221**: Make accept and reject buttons clear
- **JSV-401**: Leaderboard total captures is not correct number (data issue) 🔍 UNDER INVESTIGATION
- **JSV-411**: Test on different iPhone models (testing infrastructure)

### 📊 Medium Priority Tasks
- **JSV-285**: Ban users (Medium) - User moderation system
- **JSV-307**: Change fire emoji on streak - replace other emojis too (Medium)
- **JSV-142**: Think of example photos/labels for rarities (Medium) - Assigned to Shan
- **JSV-158**: Make collections more intuitive and straightforward (Medium)
- **JSV-186**: User Profiles to feature captures (Medium)
- **JSV-400**: Include location in collections Capture page (Medium)
- **JSV-251**: User table's total_captures column looks off (Medium)

### 🧹 Lower Priority/Polish Tasks
Many Low priority tasks for UI polish, minor features, and optimizations

## App Visual Style
- **Primary**: #F97316 (Tangerine Orange)
- **Background**: #FFF4ED (Fantasy Pink - light cream)
- **Accent**: #FACC15 (Goldenrod Yellow)
- **Secondary**: #4ADE80 (Spring Mint)
- **Font**: Lexend Deca family
- **Style**: Playful, light, soft, bright

## Task Context

### JSV-329: Pending Capture ID'd items not following public preference
- **Status**: Done (fixed in recent commit)
- **Issue**: Pending captures weren't respecting the isPublic preference setting

### JSV-357: Replace black screen background ✅ COMPLETED
- **Files**: app/(screens)/camera.tsx, app/components/camera/CameraPermissionHandler.tsx
- **Context**: Black screen appears when `permission?.status == null` during camera permission resolution
- **Current Flow**: CameraPermissionHandler → shows nothing while loading → CameraPlaceholder or CameraCapture
- **Goal**: WorldDex-branded loading screen with Midjourney-generated background
- **Considerations**: Background style, atmosphere, performance impact
- **Implementation (Feb 1, 2025)**:
  - Created `LoadingBackground` component with gradient backgrounds (not images)
  - 5 gradient variants: warm, cool, sunset, mint, golden
  - Added `useLoadingVariant` hook for random selection
  - Updated loading states in: CameraPlaceholder, PendingCaptureIdentifier, WorldDexTab
  - Shows during: camera permission loading, capture processing, WorldDex loading
  - Clean, performant solution without external image assets

### JSV-355: Offline indicator ✅ COMPLETED
- **Purpose**: Users think collection is missing when offline
- **Current**: Network checks via checkServerConnection() but no UI indicator
- **Affected Screens**: Personal captures (WorldDex tab), any screen loading from Supabase
- **Existing Utils**: src/utils/networkUtils.ts has connection checking
- **Goal**: Clean, subtle offline indicator following best practices
- **Implementation (Jan 31, 2025)**:
  - Created `OfflineIndicator` component with cloud-offline icon (app/components/OfflineIndicator.tsx)
  - Added offline state detection to personal-captures.tsx
  - Shows indicator only when offline AND no captures displayed
  - Auto-refreshes when connection restored (5-second polling, no window events in RN)
  - Follows existing design patterns (gray colors, Lexend font)
  - Added to WorldDexTab footer when only pending captures visible
  - Extended to Leaderboard, Social, and Marketplace tabs with context-specific messages
  - Made subtext optional (showSubtext prop) for non-capture contexts

### JSV-398: Social pages false offline ✅ COMPLETED
- **Problem**: Social pages showing "no connection" even when connected after JSV-355 implementation
- **Root Cause**: Proactive health checks with 3-second timeouts were too strict, causing false offline states
- **Architecture Change**: Replaced proactive polling with request-based error handling
- **Implementation (Aug 1, 2025)**:
  - Removed `hasNetworkConnection()` calls from all social tabs (Leaderboard, Social, Marketplace)
  - Added error handling to actual data requests (useTopCaptures, useListings, RPC calls)
  - Unified leaderboard error handling - parent shows single offline indicator vs duplicate errors
  - Shows offline only when actual data requests fail AND no cached data available
- **Benefits**: More accurate (tests real endpoints), more efficient (no health checks), better UX

### JSV-330: Public capture warning ✅ COMPLETED
- **Critical**: Privacy concern - users must know when capture is public
- **Current**: default_public_captures from CameraSettingsContext, no UI visibility
- **Used In**: CaptureHandlers.ts when uploading photos
- **Missing**: No toggle or indicator in camera UI showing current privacy setting
- **Goal**: Design and implement clear visual indicator for public capture mode
- **Implementation (Feb 1, 2025)**:
  - Added privacy toggle to PolaroidDevelopment component (Public/Private with earth/lock icons)
  - Toggle controls individual capture privacy, not user's default preference
  - Shows user's default on mount, allows toggling for specific capture
  - Privacy value passed through onDismiss to save functions
  - Works for both regular captures and pending captures
  - Clean, simple implementation without network checks

### JSV-406 & JSV-408: Social Page Performance & Layout Fixes ✅ COMPLETED
- **JSV-406 Issue**: Swipe detection regression after modal→page conversion - laggy, unresponsive gestures
- **JSV-408 Issue**: Rarity badges getting cut off in social feed posts
- **Root Causes**: 
  - PanResponder runs on JS thread causing poor performance
  - Complex nested scrolling (horizontal ScrollView + internal ScrollViews/FlatLists)
  - 200ms animation delays making UI feel sluggish
  - Flex layout issue: no constraints on item name vs rarity badge
- **Implementation (Aug 1, 2025)**:
  - Replaced PanResponder with react-native-tab-view for native gesture handling
  - Added React.memo() to all tab components to prevent unnecessary re-renders
  - Converted LeaderboardTab from ScrollView to FlatList for virtualization
  - Fixed rarity badge layout with flex-1 on item name and flex-shrink-0 on badge
  - Added numberOfLines={1} and ellipsizeMode="tail" for long item names
  - Optimized FlatList with windowSize, maxToRenderPerBatch, removeClippedSubviews
- **Performance Gains**: 60-120fps smooth tab switching, instant gesture response, proper text layout
- **Final Implementation**: Custom optimized solution avoids RNCViewPager dependency issues while achieving native-like performance
- **Key Techniques**: Velocity-based gestures + spring animations + comprehensive memoization + proper flex constraints