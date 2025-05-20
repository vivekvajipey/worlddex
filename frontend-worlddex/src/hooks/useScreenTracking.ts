import { useCallback } from "react";
import { usePostHog } from "posthog-react-native";

/**
 * Custom hook for tracking screen views in PostHog
 * Use this to manually track screens that aren't automatically detected
 */
export const useScreenTracking = () => {
  const posthog = usePostHog();

  const trackScreen = useCallback((screenName: string, properties?: Record<string, any>) => {
    if (posthog) {
      posthog.screen(screenName, {
        timestamp: new Date().toISOString(),
        ...properties,
      });
    }
  }, [posthog]);

  return { trackScreen };
};
