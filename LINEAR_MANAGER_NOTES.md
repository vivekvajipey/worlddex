# Linear Manager Notes

## Quick Reference
- **Update issue states**: Need UUID, not string. Use `list_issue_statuses` with team ID first.
- **JSV AI Team ID**: `0d258193-c473-4a4e-8d20-9aba2f444e5e`

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

## Learned Patterns
- 2025-07-31: State updates require UUID lookup, not direct string values

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

### JSV-357: Replace black screen background
- **Files**: app/(screens)/camera.tsx, app/components/camera/CameraPermissionHandler.tsx
- **Context**: Black screen appears when `permission?.status == null` during camera permission resolution
- **Current Flow**: CameraPermissionHandler → shows nothing while loading → CameraPlaceholder or CameraCapture
- **Goal**: WorldDex-branded loading screen with Midjourney-generated background
- **Considerations**: Background style, atmosphere, performance impact

### JSV-355: Offline indicator ✅ COMPLETED
- **Purpose**: Users think collection is missing when offline
- **Current**: Network checks via checkServerConnection() but no UI indicator
- **Affected Screens**: Personal captures (WorldDex tab), any screen loading from Supabase
- **Existing Utils**: src/utils/networkUtils.ts has connection checking
- **Goal**: Clean, subtle offline indicator following best practices
- **Implementation (Jan 31, 2025)**:
  - Created `OfflineIndicator` component with cloud-offline icon
  - Added offline state detection to personal-captures.tsx
  - Shows indicator only when offline AND no captures displayed
  - Auto-refreshes when connection restored (5-second polling + event listeners)
  - Follows existing design patterns (gray colors, Lexend font)

### JSV-330: Public capture warning
- **Critical**: Privacy concern - users must know when capture is public
- **Current**: default_public_captures from CameraSettingsContext, no UI visibility
- **Used In**: CaptureHandlers.ts when uploading photos
- **Missing**: No toggle or indicator in camera UI showing current privacy setting
- **Goal**: Design and implement clear visual indicator for public capture mode