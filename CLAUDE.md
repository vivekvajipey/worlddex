# Claude Code Context - WorldDex

This file contains important context and gotchas for future Claude Code instances working on this codebase.

## Linear Task Management
- **LINEAR_MANAGER_NOTES.md** - Contains Linear API learnings, state UUIDs, and task-specific context/discussions
- Use this file to preserve context from task planning sessions and implementation decisions

## StyledAlert System

### Overview
- StyledAlerts are managed by `AlertContext` and rendered via `StyledAlert` component
- They appear as centered modal popups with customizable icons, colors, and buttons
- **Completely separate** from the modal queue system (and should stay that way)

### Usage
```typescript
const { showAlert } = useAlert();

showAlert({
  title: "Success!",
  message: "Your action completed.",
  icon: "checkmark-circle",
  iconColor: "#10B981"
});
```

### Critical Modal Interaction Issues

#### ⚠️ Nested Modal Problem
React Native has issues with nested modals. If you call `showAlert()` from within a Modal component:
- The alert may render **behind** the modal (invisible but blocking all touches)
- The alert may get stuck in the modal's rendering context
- Users will be unable to interact with anything on screen

#### ✅ Solution: Close Modal First
Always close any modal before showing an alert:

```typescript
// BAD - Will cause invisible blocking alert
const handleDelete = () => {
  showAlert({ title: "Confirm Delete", ... });
};

// GOOD - Close modal, then show alert
const handleDelete = () => {
  closeModal();
  setTimeout(() => {
    showAlert({ title: "Confirm Delete", ... });
  }, 300); // Wait for modal animation
};
```

### Modal vs Screen Architecture

#### Current Setup
- **Camera**: Regular screen
- **Personal Captures**: Regular screen (was a modal, converted to fix modal queue issues)
- **Modal Queue**: Shows rewards/level-ups via `ModalCoordinator` in root layout
- **Alerts**: Show via `StyledAlert` in `AlertProvider` in root layout

#### Why Personal Captures Was Converted
1. Modal queue couldn't show rewards inside a modal
2. Nested modal issues with alerts
3. Better navigation UX as a screen

### Best Practices

1. **Keep alerts and modal queue separate** - Different use cases, different behaviors
2. **Avoid showing alerts from within modals** - Close modal first, then show alert
3. **Use screens instead of modals for complex views** - Avoids nested modal issues
4. **Always test alert visibility** - Check that alerts appear and don't block UI

## ⚠️ CRITICAL PATH BUG
**ALWAYS type "worlddex" NOT "worlddx" in file paths!**
- ✅ Correct: `/Users/vivekvajipey/Development/jsv-ai/worlddex/frontend-worlddex/`
- ❌ Wrong: `/Users/vivekvajipey/Development/jsv-ai/worlddx/frontend-worlddx/`

Double-check every file path contains "worlddex" not "worlddx" to avoid "File does not exist" errors.