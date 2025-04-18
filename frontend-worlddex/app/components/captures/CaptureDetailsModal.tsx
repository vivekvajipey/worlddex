import React from "react";
import { View, Text, Modal, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { Capture } from "../../../database/types";

interface CaptureDetailsModalProps {
  visible: boolean;
  capture: Capture | null;
  onClose: () => void;
}

const CaptureDetailsModal: React.FC<CaptureDetailsModalProps> = ({
  visible,
  capture,
  onClose,
}) => {
  const { downloadUrl, loading } = useDownloadUrl(capture?.image_key || "");

  if (!capture) return null;

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
          <View className="p-6 bg-background flex-1">
            <Text className="text-text-primary text-2xl font-lexend-bold mb-4 text-center">
              {capture.item_name}
            </Text>
            <View className="flex-row justify-center mb-2">
              <Ionicons name="time-outline" size={18} color="#000" />
              <Text className="text-text-primary ml-2 font-lexend-regular">
                Captured at: {new Date(capture.captured_at || "").toLocaleString()}
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
          </View>
        </View>
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 50,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#333",
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default CaptureDetailsModal; 