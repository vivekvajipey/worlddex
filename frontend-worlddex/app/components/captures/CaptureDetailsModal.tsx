import React, { useEffect, useState } from "react";
import { View, Text, Modal, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { Capture } from "../../../database/types";
import { fetchItem } from "../../../database/hooks/useItems";

interface CaptureDetailsModalProps {
  visible: boolean;
  capture: Capture | null;
  onClose: () => void;
  onDelete?: (capture: Capture) => void;
}

const CaptureDetailsModal: React.FC<CaptureDetailsModalProps> = ({
  visible,
  capture,
  onClose,
  onDelete,
}) => {
  const { downloadUrl, loading } = useDownloadUrl(capture?.image_key || "");
  const [totalCaptures, setTotalCaptures] = useState<number | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);

  useEffect(() => {
    const loadItemData = async () => {
      if (capture?.item_id) {
        setIsLoadingItem(true);
        try {
          const itemData = await fetchItem(capture.item_id);
          if (itemData) {
            setTotalCaptures(itemData.total_captures);
          }
        } catch (error) {
          console.error("Error fetching item data:", error);
        } finally {
          setIsLoadingItem(false);
        }
      }
    };

    loadItemData();
  }, [capture?.item_id]);

  if (!capture) return null;

  const handleDelete = () => {
    if (onDelete && capture) {
      onDelete(capture);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
        }}
      >
        <View className="flex-1">
          <View className="h-1/2 bg-background">
            {loading ? (
              <View className="w-full h-full justify-center items-center">
                <ActivityIndicator size="large" color="#FFF" />
              </View>
            ) : (
              <Image
                source={{ uri: downloadUrl || undefined }}
                className="w-full h-full"
                resizeMode="contain"
              />
            )}
          </View>

          {/* Content area - reduced top padding to be closer to image */}
          <View className="pt-2 px-6 pb-6 bg-background flex-1">
            <Text className="text-text-primary text-2xl font-lexend-bold mb-2 text-center">
              {capture.item_name}
            </Text>

            {/* Capture number / total captures */}
            <View className="flex-row justify-center mb-3">
              <View className="bg-gray-200 px-3 py-1 rounded-full">
                <Text className="text-text-primary font-lexend-medium">
                  {isLoadingItem ? (
                    "Loading..."
                  ) : (
                    `Capture #${capture.capture_number} of ${totalCaptures || '?'}`
                  )}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-center mb-2">
              <Ionicons name="time-outline" size={18} color="#000" />
              <Text className="text-text-primary ml-2 font-lexend-regular">
                Captured: {formatDate(capture.captured_at || "")}
              </Text>
            </View>

            {capture.location && (
              <View className="flex-row justify-center">
                <Ionicons name="location-outline" size={18} color="#000" />
                <Text className="text-text-primary ml-2 font-lexend-regular">
                  Location: {JSON.stringify(capture.location)}
                </Text>
              </View>
            )}

            {onDelete && (
              <TouchableOpacity
                className="mt-auto bg-red-500 py-3 rounded-lg items-center"
                onPress={handleDelete}
              >
                <Text className="text-white font-lexend-bold">Delete Capture</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity
          className="absolute top-12 right-4 w-10 h-10 rounded-full bg-primary justify-center items-center"
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default CaptureDetailsModal; 