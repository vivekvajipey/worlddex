import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingFooterProps {
  loading?: boolean;
  hasMore?: boolean;
  customText?: string;
  color?: string;
}

const LoadingFooter: React.FC<LoadingFooterProps> = ({
  loading = false,
  hasMore = true,
  customText,
  color = "#3B82F6"
}) => {
  if (!loading || !hasMore) return null;

  return (
    <View className="py-4 items-center">
      <ActivityIndicator size="small" color={color} />
      <Text className="text-gray-500 mt-2 font-lexend-regular">
        {customText || "Loading more..."}
      </Text>
    </View>
  );
};

export default LoadingFooter;