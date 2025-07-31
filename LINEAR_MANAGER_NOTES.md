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

## Task Context

### JSV-329: Pending Capture ID'd items not following public preference
- **Status**: Done (fixed in recent commit)
- **Issue**: Pending captures weren't respecting the isPublic preference setting

### JSV-357: Replace black screen background
- **Files**: app/index.tsx, app/(screens)/camera.tsx
- **Context**: Shows during camera initialization
- **Goal**: WorldDex-branded loading screen instead of black

### JSV-355: Offline indicator
- **Purpose**: Users think collection is missing when offline
- **Approach**: Check NetworkService, add non-intrusive but visible indicator

### JSV-330: Public capture warning
- **Critical**: Privacy concern - users must know when capture is public
- **Location**: Camera screen, look for isPublic state
- **Need**: Prominent visual indicator during capture