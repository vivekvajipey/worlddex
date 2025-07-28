# WorldDex Permissions Implementation Plan

## Overview
A phased approach to implement optimal permission handling while maintaining app functionality and user experience.

## Phase 1: Foundation (Week 1)
### 1.1 Create Permission Service
**Goal**: Centralized permission management with state tracking

```typescript
// src/services/PermissionService.ts
export type PermissionType = 'camera' | 'location' | 'notification' | 'photoLibrary';
export type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'restricted';

interface PermissionState {
  status: PermissionStatus;
  lastRequested?: Date;
  softDeniedAt?: Date;
  primerShownAt?: Date;
  grantedAt?: Date;
}

class PermissionService {
  // Check permission status without triggering request
  static async getStatus(type: PermissionType): Promise<PermissionStatus>
  
  // Get full permission state from storage
  static async getState(type: PermissionType): Promise<PermissionState>
  
  // Update permission state
  static async updateState(type: PermissionType, updates: Partial<PermissionState>)
  
  // Check if we should show primer
  static async shouldShowPrimer(type: PermissionType): Promise<boolean>
  
  // Request permission (with primer if needed)
  static async request(type: PermissionType, options?: { skipPrimer?: boolean }): Promise<boolean>
}
```

### 1.2 Create Camera Placeholder Component
**Goal**: Beautiful placeholder UI when camera permission not granted

```typescript
// app/components/camera/CameraPlaceholder.tsx
interface CameraPlaceholderProps {
  onRequestPermission: () => void;
  permissionStatus: PermissionStatus;
}

export const CameraPlaceholder: React.FC<CameraPlaceholderProps> = ({
  onRequestPermission,
  permissionStatus
}) => {
  return (
    <View className="flex-1 bg-black justify-center items-center">
      {/* Animated WorldDex logo or branded animation */}
      <Animated.View>
        <WorldDexLogo />
      </Animated.View>
      
      {permissionStatus === 'undetermined' && (
        <>
          <Text className="text-white text-xl font-lexend-medium mt-8 mb-4">
            Ready to explore the world?
          </Text>
          <TouchableOpacity
            onPress={onRequestPermission}
            className="bg-primary px-8 py-4 rounded-full"
          >
            <Text className="text-white font-lexend-semibold">
              Start Capturing
            </Text>
          </TouchableOpacity>
        </>
      )}
      
      {permissionStatus === 'denied' && (
        <>
          <Text className="text-white text-lg font-lexend-medium mt-8 mb-2">
            Camera access needed
          </Text>
          <Text className="text-gray-400 text-base font-lexend-regular mb-4 text-center px-8">
            Enable camera in Settings to start capturing
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openSettings()}
            className="bg-primary px-8 py-4 rounded-full"
          >
            <Text className="text-white font-lexend-semibold">
              Open Settings
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};
```

## Phase 2: Permission Priming (Week 1-2)
### 2.1 Create Reusable Permission Primer
**Goal**: Beautiful, branded permission explanation modals

```typescript
// app/components/permissions/PermissionPrimer.tsx
export const PermissionPrimer: React.FC<PermissionPrimerProps> = ({
  type,
  visible,
  onAllow,
  onDeny
}) => {
  // Animated entrance
  // Clear value proposition
  // Branded UI consistent with app design
  // Soft denial handling
};
```

### 2.2 Create Permission Hooks
**Goal**: Easy-to-use hooks for permission management

```typescript
// src/hooks/usePermission.ts
export const usePermission = (type: PermissionType) => {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(true);
  
  const checkPermission = async () => {
    const currentStatus = await PermissionService.getStatus(type);
    setStatus(currentStatus);
    setIsLoading(false);
  };
  
  const requestPermission = async (options?: { skipPrimer?: boolean }) => {
    const granted = await PermissionService.request(type, options);
    await checkPermission();
    return granted;
  };
  
  useEffect(() => {
    checkPermission();
  }, []);
  
  return {
    status,
    isLoading,
    requestPermission,
    isGranted: status === 'granted',
    isDenied: status === 'denied'
  };
};
```

## Phase 3: Camera Permission Migration (Week 2)
### 3.1 Update Camera Screen
**Implementation Steps**:

1. **Remove automatic permission requests**
2. **Add placeholder UI for no-permission state**
3. **Implement permission priming on first capture attempt**

```typescript
// app/(screens)/camera.tsx
export default function CameraScreen() {
  const { status: cameraStatus, requestPermission: requestCamera } = usePermission('camera');
  const [showPrimer, setShowPrimer] = useState(false);
  
  // Don't initialize camera until permission granted
  const shouldInitializeCamera = cameraStatus === 'granted';
  
  const handleCaptureAttempt = async () => {
    if (cameraStatus === 'granted') {
      // Proceed with capture
      startCapture();
    } else if (cameraStatus === 'undetermined') {
      // Show primer
      const shouldShowPrimer = await PermissionService.shouldShowPrimer('camera');
      if (shouldShowPrimer) {
        setShowPrimer(true);
      } else {
        // Request directly if primer already shown
        await requestCamera({ skipPrimer: true });
      }
    } else {
      // Show settings prompt
      showSettingsPrompt();
    }
  };
  
  return (
    <View className="flex-1">
      {shouldInitializeCamera ? (
        <CameraCapture
          ref={cameraCaptureRef}
          onCapture={handleCapture}
          onFullScreenCapture={handleFullScreenCapture}
        />
      ) : (
        <CameraPlaceholder
          onRequestPermission={handleCaptureAttempt}
          permissionStatus={cameraStatus}
        />
      )}
      
      <PermissionPrimer
        type="camera"
        visible={showPrimer}
        onAllow={async () => {
          setShowPrimer(false);
          await requestCamera({ skipPrimer: true });
        }}
        onDeny={() => {
          setShowPrimer(false);
          PermissionService.updateState('camera', { softDeniedAt: new Date() });
        }}
      />
    </View>
  );
}
```

### 3.2 Remove Media Library Permission
**Steps**:
1. Remove from `camera.tsx` - it's not used for saving
2. Keep in collection/profile components where ImagePicker is used
3. Update `app.json` to remove unused descriptions

## Phase 4: Location Permission (Week 2-3)
### 4.1 Move Location Request to Post-Capture
**Implementation**:

```typescript
// In handleDismissPreview after successful capture
const handlePostCaptureLocation = async () => {
  if (locationStatus === 'undetermined' && captureSuccess) {
    const shouldAskLocation = await PermissionService.shouldShowPrimer('location');
    if (shouldAskLocation) {
      // Show location value prop after successful capture
      showLocationPrompt({
        title: `Great capture of ${identifiedLabel}!`,
        subtitle: "Want to remember where you found it?",
        onAllow: () => requestLocation(),
        onSkip: () => saveWithoutLocation()
      });
    }
  }
};
```

## Phase 5: Notification Permission (Week 3)
### 5.1 Remove from App Launch
**Steps**:
1. Remove automatic request from `_layout.tsx`
2. Create engagement-based trigger

### 5.2 Implement Smart Notification Prompt
**Triggers**:
- After 3rd capture
- On 2nd day of app usage
- After completing first collection

```typescript
// src/hooks/useNotificationPrompt.ts
export const useNotificationPrompt = () => {
  const checkNotificationTriggers = async () => {
    const captures = await getUserCaptureCount();
    const daysSinceInstall = await getDaysSinceInstall();
    const hasCompletedCollection = await checkCollectionCompletion();
    
    if (captures >= 3 || daysSinceInstall >= 2 || hasCompletedCollection) {
      const shouldShow = await PermissionService.shouldShowPrimer('notification');
      if (shouldShow) {
        showNotificationPrimer();
      }
    }
  };
};
```

## Phase 6: Database Integration (Week 3)
### 6.1 User Permission Preferences
**Goal**: Store user permission preferences and analytics in Supabase

#### Database Schema Addition
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS permission_preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_notification_prompt TIMESTAMP WITH TIME ZONE;

-- Create permission events table for analytics
CREATE TABLE permission_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    permission_type TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'primer_shown', 'primer_allowed', 'primer_denied', 'native_granted', 'native_denied'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Index for analytics queries
CREATE INDEX idx_permission_events_user_type ON permission_events(user_id, permission_type);
CREATE INDEX idx_permission_events_created ON permission_events(created_at);
```

#### Update PermissionService
```typescript
// Add to PermissionService.ts
import { supabase } from '../../supabase/client';

export class PermissionService {
  // ... existing methods ...
  
  /**
   * Sync permission state with Supabase
   */
  static async syncWithDatabase(userId: string, type: PermissionType): Promise<void> {
    try {
      const state = await this.getState(type);
      
      // Update user preferences
      const { error } = await supabase
        .from('users')
        .update({
          permission_preferences: {
            [type]: {
              status: state.status,
              grantedAt: state.grantedAt,
              lastRequested: state.lastRequested
            }
          },
          // Special handling for notifications
          ...(type === 'notification' && state.status === 'granted' 
            ? { notification_enabled: true } 
            : {})
        })
        .eq('id', userId);
        
      if (error) console.error('Error syncing permission state:', error);
    } catch (error) {
      console.error('Error in syncWithDatabase:', error);
    }
  }
  
  /**
   * Log permission event for analytics
   */
  static async logEvent(
    userId: string, 
    type: PermissionType, 
    eventType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('permission_events')
        .insert({
          user_id: userId,
          permission_type: type,
          event_type: eventType,
          metadata
        });
    } catch (error) {
      console.error('Error logging permission event:', error);
    }
  }
}
```

### 6.2 Smart Notification Triggers
**Goal**: Use database to track engagement metrics for notification prompts

```typescript
// src/hooks/useNotificationTrigger.ts
export const useNotificationTrigger = () => {
  const { session } = useAuth();
  
  const checkTriggers = async () => {
    if (!session?.user?.id) return false;
    
    // Get user data with capture count
    const { data: userData } = await supabase
      .from('users')
      .select('created_at, last_notification_prompt')
      .eq('id', session.user.id)
      .single();
      
    const { count: captureCount } = await supabase
      .from('captures')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);
      
    // Check triggers
    const daysSinceJoined = daysSince(userData.created_at);
    const hasBeenPrompted = !!userData.last_notification_prompt;
    
    // Trigger conditions
    if (captureCount >= 3 || daysSinceJoined >= 2) {
      if (!hasBeenPrompted) {
        return true;
      }
      
      // Re-prompt after 14 days if soft denied
      if (userData.last_notification_prompt) {
        const daysSincePrompt = daysSince(userData.last_notification_prompt);
        return daysSincePrompt >= 14;
      }
    }
    
    return false;
  };
  
  const markPromptShown = async () => {
    await supabase
      .from('users')
      .update({ last_notification_prompt: new Date().toISOString() })
      .eq('id', session.user.id);
  };
  
  return { checkTriggers, markPromptShown };
};
```

## Phase 7: Testing & Refinement (Week 3-4)
### 7.1 A/B Testing Setup
- Track permission acceptance rates via permission_events table
- Compare before/after metrics
- Monitor user retention

### 7.2 Analytics Dashboard Queries
```sql
-- Permission funnel analysis
SELECT 
  permission_type,
  COUNT(DISTINCT CASE WHEN event_type = 'primer_shown' THEN user_id END) as primer_shown,
  COUNT(DISTINCT CASE WHEN event_type = 'primer_allowed' THEN user_id END) as primer_allowed,
  COUNT(DISTINCT CASE WHEN event_type = 'native_granted' THEN user_id END) as granted,
  ROUND(
    COUNT(DISTINCT CASE WHEN event_type = 'native_granted' THEN user_id END)::numeric / 
    NULLIF(COUNT(DISTINCT CASE WHEN event_type = 'primer_shown' THEN user_id END), 0) * 100, 
    2
  ) as conversion_rate
FROM permission_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY permission_type;

-- User retention by permission status
SELECT 
  CASE 
    WHEN notification_enabled THEN 'Notifications Enabled'
    ELSE 'Notifications Disabled'
  END as status,
  COUNT(*) as user_count,
  AVG(DATE_PART('day', NOW() - last_seen_at)) as avg_days_since_active
FROM users
GROUP BY notification_enabled;
```

## Implementation Order

### Week 1: Foundation
1. ✅ Create PermissionService.ts
2. ✅ Create CameraPlaceholder component
3. ✅ Test camera screen with placeholder

### Week 2: Camera & Priming
1. ✅ Create PermissionPrimer component
2. ✅ Implement usePermission hook
3. ✅ Update camera screen with new flow
4. ✅ Remove media library permission

### Week 3: Location & Notifications
1. ✅ Move location to post-capture
2. ✅ Remove notification from launch
3. ✅ Implement engagement triggers

### Week 4: Polish & Testing
1. ✅ Add analytics
2. ✅ A/B test results
3. ✅ Refine timing and messaging

## Success Metrics

### Target Improvements
- Camera permission: 70% → 90% acceptance
- Location permission: 60% → 85% acceptance  
- Notification permission: 40% → 70% acceptance
- Settings redirects: < 5% of denials

### User Experience Goals
- No black camera screen on first launch
- Clear value proposition for each permission
- Smooth recovery from denials
- Minimal friction in capture flow

## Key Design Decisions

### 1. Camera Placeholder Instead of Black Screen
- Show branded, animated placeholder
- Clear CTA to enable camera
- Matches Snapchat's approach

### 2. Soft Denial Strategy
- Don't show iOS dialog on primer denial
- Re-prompt after meaningful engagement
- Track soft denials separately

### 3. Progressive Permission Requests
- Camera: On first capture attempt
- Location: After successful capture
- Notifications: After proven engagement

### 4. Unified Permission State
- Single source of truth
- Persistent across sessions
- Easy to test and debug

This plan provides a clear path to optimal permission handling while maintaining app functionality and improving user experience.