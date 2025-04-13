import { ActivityIndicator, Text, View } from "react-native";
import { IdentificationStatus } from "../../types/camera";

interface FeedbackOverlayProps {
  status: IdentificationStatus;
}

/**
 * Feedback overlay component for displaying identification status
 */
export const FeedbackOverlay = ({ status }: FeedbackOverlayProps) => {
  if (!status.message) return null;
  
  return (
    <View className="absolute top-12 left-5 right-5 bg-black/40 rounded-lg p-2 items-center">
      {status.isLoading ? (
        <View className="flex-row items-center">
          <ActivityIndicator size="small" color="#FFF4ED" />
          <Text className="text-white font-lexend-regular ml-2">{status.message}</Text>
        </View>
      ) : (
        <Text className="text-white font-lexend-medium text-center">{status.message}</Text>
      )}
    </View>
  );
};
