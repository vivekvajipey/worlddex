import React from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { Capture } from "../../../database/types";
import CaptureThumbnail from "./CaptureThumbnail";

interface WorldDexTabProps {
  displayCaptures: Capture[];
  loading: boolean;
  urlsLoading?: boolean;
  urlMap?: Record<string, string>;
  onCapturePress: (capture: Capture) => void;
}

const WorldDexTab: React.FC<WorldDexTabProps> = ({
  displayCaptures,
  loading,
  urlsLoading = false,
  urlMap = {},
  onCapturePress
}) => {
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (!displayCaptures.length) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-text-primary font-lexend-medium">No captures yet.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlatList
        data={displayCaptures}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CaptureThumbnail
            capture={item}
            onPress={() => onCapturePress(item)}
            downloadUrl={urlMap[item.image_key]}
            loading={urlsLoading}
          />
        )}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: 'flex-start', paddingHorizontal: 8 }}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        style={{ width: '100%', flex: 1 }}
      />
    </View>
  );
};

export default WorldDexTab; 