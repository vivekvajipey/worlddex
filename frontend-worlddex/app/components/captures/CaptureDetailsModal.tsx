import React, { useEffect, useState } from "react";
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Switch } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { Capture } from "../../../database/types";
import { fetchItem } from "../../../database/hooks/useItems";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUser } from "../../../database/hooks/useUsers";

interface CaptureDetailsModalProps {
  visible: boolean;
  capture: Capture | null;
  onClose: () => void;
  onDelete?: (capture: Capture) => void;
  onUpdate?: (capture: Capture, updates: Partial<Capture>) => void;
}

const CaptureDetailsModal: React.FC<CaptureDetailsModalProps> = ({
  visible,
  capture,
  onClose,
  onDelete,
  onUpdate,
}) => {
  const { downloadUrl, loading } = useDownloadUrl(capture?.image_key || "");
  const [totalCaptures, setTotalCaptures] = useState<number | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const { session } = useAuth();
  const { user: currentUser } = useUser(session?.user?.id || null);
  const { user: previousOwner } = useUser(capture?.last_owner_id || null);

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

  // Set isPublic state when capture changes
  useEffect(() => {
    if (capture && capture.is_public !== undefined) {
      setIsPublic(!!capture.is_public);
    }
  }, [capture]);

  const handleTogglePublic = (value: boolean) => {
    if (capture && onUpdate) {
      setIsPublic(value);
      onUpdate(capture, { is_public: value });
    }
  };

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
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                transition={300}
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

            {/* Public/Private Toggle */}
            {onUpdate && (
              <View className="flex-row items-center justify-center mt-4 mb-2">
                <View className="flex-row items-center bg-gray-100 px-4 py-2 rounded-lg">
                  <Ionicons
                    name={isPublic ? "globe-outline" : "lock-closed-outline"}
                    size={20}
                    color="#000"
                  />
                  <Text className="mx-2 font-lexend-medium">
                    {isPublic ? "Public" : "Private"}
                  </Text>
                  <Switch
                    value={isPublic}
                    onValueChange={handleTogglePublic}
                    trackColor={{ false: "#E0E0E0", true: "#BEE3F8" }}
                    thumbColor={isPublic ? "#3B82F6" : "#9CA3AF"}
                  />
                </View>
              </View>
            )}

            <View className="flex-1" />

            {capture.last_owner_id && capture.last_owner_id !== capture.user_id && (
              <View className="flex-row justify-center mb-4">
                <View className={`flex-row items-center px-4 py-2 rounded-lg ${capture.transaction_type === "buy-now" ? "bg-green-100" :
                  capture.transaction_type === "auction" ? "bg-blue-100" :
                    "bg-yellow-100"
                  }`}>
                  <Ionicons
                    name={
                      capture.transaction_type === "buy-now" ? "pricetag" :
                        capture.transaction_type === "auction" ? "hammer" :
                          "swap-horizontal"
                    }
                    size={18}
                    color={
                      capture.transaction_type === "buy-now" ? "#16A34A" :
                        capture.transaction_type === "auction" ? "#2563EB" :
                          "#F59E42"
                    }
                  />
                  <Text className={`ml-2 text-sm font-lexend-medium ${capture.transaction_type === "buy-now" ? "text-green-700" :
                    capture.transaction_type === "auction" ? "text-blue-700" :
                      "text-yellow-700"
                    }`}>
                    {capture.transaction_type === "buy-now" ? "Bought from: " :
                      capture.transaction_type === "auction" ? "Auctioned from: " :
                        "Traded from: "}
                    {previousOwner?.username || "Unknown user"}
                  </Text>
                </View>
              </View>
            )}

            {onDelete && (
              <TouchableOpacity
                className="bg-red-500 py-3 rounded-lg items-center"
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