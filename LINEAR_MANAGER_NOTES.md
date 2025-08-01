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

## Current Priority Tasks (Aug 1, 2025)

### ✅ Recently Completed
- **JSV-399**: Daily capture limit not resetting - Set up pg_cron daily reset
- **JSV-357**: Black screen background - Gradient loading backgrounds  
- **JSV-355**: Offline indicator - OfflineIndicator component
- **JSV-330**: Public capture warning - Privacy toggle in PolaroidDevelopment

### 🚨 Urgent Investigation Needed
- **JSV-395**: VLM AbortError bug - Captures getting stuck with `[AbortError: Aborted]`

### 🔍 High Priority Investigations  
- **JSV-398**: Social pages showing no connection when connected
- **JSV-391**: Convert social modal to page (architectural change)
- **JSV-389**: Add WorldDex collection pagination loading states

### 🔥 High Priority Features
- **JSV-328**: Store pfp locally so it doesn't need to load  
- **JSV-358**: Introduce lasso capture on Level 2
- **JSV-256**: Share captures outside of the app

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