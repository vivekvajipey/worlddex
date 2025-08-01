import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface OfflineIndicatorProps {
  message?: string;
  showSubtext?: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  message = "No internet connection",
  showSubtext = true
}) => {
  return (
    <View className="flex-1 justify-center items-center p-8">
      <Ionicons name="cloud-offline-outline" size={48} color="#6B7280" />
      <Text className="text-gray-400 font-lexend-medium text-lg text-center mt-4">
        {message}
      </Text>
      {showSubtext && (
        <Text className="text-gray-500 font-lexend text-base text-center mt-2">
          Your captures are safe but need internet to sync
        </Text>
      )}
    </View>
  );
};

export default OfflineIndicator;