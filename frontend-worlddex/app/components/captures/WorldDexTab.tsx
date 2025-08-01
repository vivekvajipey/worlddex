import React, { useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CombinedCapture } from "../../../src/types/combinedCapture";
import CaptureThumbnail from "./CaptureThumbnail";
import { usePostHog } from "posthog-react-native";
import OfflineIndicator from "../OfflineIndicator";
import { LoadingBackground } from "../LoadingBackground";
import { useLoadingVariant } from "../../../src/hooks/useLoadingVariant";

interface WorldDexTabProps {
  displayCaptures: CombinedCapture[];
  loading: boolean;
  urlsLoading?: boolean;
  urlMap?: Record<string, string>;
  onCapturePress: (capture: CombinedCapture) => void;
  active: boolean; // Add active prop to the interface
  isOffline?: boolean;
}

const WorldDexTab: React.FC<WorldDexTabProps> = ({
  displayCaptures,
  loading,
  urlsLoading = false,
  urlMap = {},
  onCapturePress,
  active, // Add active prop to the component
  isOffline = false
}) => {
  const posthog = usePostHog();
  const loadingVariant = useLoadingVariant();

  useEffect(() => {
    // Track screen view only when tab becomes active
    if (active && posthog) {
      posthog.screen("WorldDex-Tab", {
        captureCount: displayCaptures?.length || 0
      });
    }
  }, [active, posthog, displayCaptures?.length]);

  if (loading) {
    return (
      <LoadingBackground 
        message="Loading your captures..."
        showSpinner={true}
        variant={loadingVariant}
      />
    );
  }

  if (!displayCaptures.length) {
    // Show offline indicator if offline and no captures
    if (isOffline) {
      return <OfflineIndicator />;
    }
    
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-text-primary font-lexend-medium">No captures yet.</Text>
      </View>
    );
  }

  // Check if we only have pending captures
  const onlyPendingCaptures = displayCaptures.every(capture => 
    capture.isPending || capture.pendingStatus === 'temporary'
  );

  return (
    <View className="flex-1">
      <FlatList
        data={displayCaptures}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CaptureThumbnail
            capture={item}
            onPress={() => onCapturePress(item)}
            downloadUrl={item.isPending || item.pendingStatus === 'temporary' ? urlMap[item.id] : urlMap[item.thumb_key || item.image_key]}
            loading={urlsLoading}
            isPending={item.isPending}
          />
        )}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: 'flex-start', paddingHorizontal: 8 }}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        style={{ width: '100%', flex: 1 }}
        ListFooterComponent={
          isOffline && onlyPendingCaptures ? (
            <View className="mt-8 px-4">
              <View className="flex-row items-center justify-center mb-2">
                <Ionicons name="cloud-offline-outline" size={24} color="#9CA3AF" />
                <Text className="text-gray-400 font-lexend-medium text-base ml-2">
                  Offline - Synced captures unavailable
                </Text>
              </View>
              <Text className="text-gray-500 font-lexend text-sm text-center">
                Connect to internet to see your full collection
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default WorldDexTab; 