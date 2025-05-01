import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUserCaptures } from "../../../database/hooks/useCaptures";
import { createListing } from "../../../database/hooks/useListings";
import { addMultipleListingItems } from "../../../database/hooks/useListingItems";
import { Listing } from "../../../database/types";
import { Picker } from "@react-native-picker/picker";
import { Image } from "expo-image";
import { useDownloadUrls } from "../../../src/hooks/useDownloadUrls";
import { useListings } from "../../../database/hooks/useListings";

interface CreateListingScreenProps {
  visible: boolean;
  onClose: () => void;
  onListingCreated?: () => void;
}

const CreateListingScreen: React.FC<CreateListingScreenProps> = ({
  visible,
  onClose,
  onListingCreated,
}) => {
  const { session } = useAuth();

  // Form state
  const [listingType, setListingType] = useState<"auction" | "buy-now" | "trade">("auction");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [showReserveInfo, setShowReserveInfo] = useState(false);

  const durationOptions = [
    { label: "1 hour", value: "1" },
    { label: "2 hours", value: "2" },
    { label: "4 hours", value: "4" },
    { label: "8 hours", value: "8" },
    { label: "12 hours", value: "12" },
    { label: "1 day", value: "24" },
    { label: "2 days", value: "48" },
    { label: "3 days", value: "72" },
    { label: "5 days", value: "120" },
    { label: "7 days", value: "168" },
  ];
  const [duration, setDuration] = useState(durationOptions[5].value);

  const [selectedCaptures, setSelectedCaptures] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form & refresh active listings when modal opens
  const {
    listings: activeListings,
    refresh: refreshActiveListings
  } = useListings({ sellerId: session?.user?.id, status: "active" });

  useEffect(() => {
    if (visible) {
      refreshActiveListings();
      setListingType("auction");
      setTitle("");
      setDescription("");
      setPrice("");
      setReservePrice("");
      setShowReserveInfo(false);
      setDuration(durationOptions[5].value);
      setSelectedCaptures([]);
      setIsSubmitting(false);
    }
  }, [visible]);

  // Load user's captures
  const { captures, loading: capturesLoading } = useUserCaptures(session?.user?.id || null);

  // Determine which captures are already listed
  const listedCaptureIds = useMemo(() => {
    const ids = new Set<string>();
    activeListings.forEach(listing => {
      listing.listing_items?.forEach(item => {
        if (item.captures?.id) ids.add(item.captures.id);
      });
    });
    return ids;
  }, [activeListings]);

  // Download URLs for images
  const imageKeys = useMemo(
    () => captures?.map(capture => capture.image_key).filter(Boolean) as string[],
    [captures]
  );
  const { items: imageUrlItems } = useDownloadUrls(imageKeys);
  const imageUrlMap = Object.fromEntries(imageUrlItems.map(item => [item.key, item.downloadUrl]));

  // Helpers
  const isValidPrice = (val: string) => {
    const n = parseFloat(val);
    return !isNaN(n) && n >= 0;
  };
  const isFormValid = () => {
    if (!title || selectedCaptures.length === 0) return false;
    if (listingType === "buy-now") return isValidPrice(price);
    if (listingType === "auction") return isValidPrice(reservePrice);
    return true;
  };
  const toggleCaptureSelection = (captureId: string) => {
    setSelectedCaptures(prev =>
      prev.includes(captureId)
        ? prev.filter(id => id !== captureId)
        : [...prev, captureId]
    );
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!session?.user?.id || !isFormValid()) return;
    setIsSubmitting(true);

    try {
      const newListingData: Partial<Listing> = {
        seller_id: session.user.id,
        title,
        description,
        listing_type: listingType,
        status: "active",
        expires_at: new Date(Date.now() + parseInt(duration, 10) * 60 * 60 * 1000).toISOString(),
      };

      if (listingType === "buy-now") {
        newListingData.price = parseFloat(price);
      } else if (listingType === "auction") {
        newListingData.reserve_price = parseFloat(reservePrice);
        newListingData.auction_type = "second-price";
      }

      const created = await createListing(newListingData as any);
      if (created) {
        const items = selectedCaptures.map(captureId => ({
          listing_id: created.id,
          capture_id: captureId,
        }));
        await addMultipleListingItems(items);
        onListingCreated?.();
        onClose();
      }
    } catch (err) {
      console.error("Error creating listing:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAuction = listingType === "auction";
  const isBuyNow = listingType === "buy-now";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50">
        <View className="flex-1 mt-20 bg-background rounded-t-3xl">
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="text-xl font-lexend-bold">Create Listing</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Listing Type */}
            <View className="mb-4">
              <Text className="text-lg font-lexend-medium mb-2">Listing Type</Text>
              <View className="flex-row space-x-2">
                {["buy-now", "auction", "trade"].map(type => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setListingType(type as any)}
                    className={`flex-1 py-2 rounded-full ${listingType === type ? "bg-primary" : "bg-gray-200"
                      }`}
                  >
                    <Text className={`text-center font-lexend-medium ${listingType === type ? "text-white" : "text-gray-600"
                      }`}>
                      {type.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Basic Info */}
            <View className="mb-4">
              <Text className="text-lg font-lexend-medium mb-2">
                <Text className="text-primary">*</Text> Basic Info
              </Text>
              <TextInput
                placeholder="Title"
                value={title}
                onChangeText={setTitle}
                className={`border rounded-lg p-3 mb-2 font-lexend-regular ${!title ? "border-primary" : "border-gray-300"
                  }`}
              />
              <TextInput
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                className="border border-gray-300 rounded-lg p-3 mb-2 font-lexend-regular"
              />
            </View>

            {/* Price / Reserve */}
            {isBuyNow && (
              <View className="mb-4">
                <Text className="text-lg font-lexend-medium mb-2">
                  <Text className="text-primary">*</Text> Price
                </Text>
                <TextInput
                  placeholder="Price in coins"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  className={`border rounded-lg p-3 font-lexend-regular ${!isValidPrice(price) ? "border-primary" : "border-gray-300"
                    }`}
                />
                {!isValidPrice(price) && (
                  <Text className="text-primary text-sm mt-1 font-lexend-regular">
                    Please enter a valid price &gt;= 0
                  </Text>
                )}
              </View>
            )}

            {isAuction && (
              <View className="mb-4">
                <View className="flex-row items-center mb-2">
                  <Text className="text-lg font-lexend-medium mr-2">
                    <Text className="text-primary">*</Text> Reserve Price
                  </Text>
                  <TouchableOpacity onPress={() => setShowReserveInfo(true)}>
                    <Ionicons name="information-circle-outline" size={22} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  placeholder="Reserve Price in coins"
                  value={reservePrice}
                  onChangeText={setReservePrice}
                  keyboardType="numeric"
                  className={`border rounded-lg p-3 font-lexend-regular ${!isValidPrice(reservePrice) ? "border-primary" : "border-gray-300"
                    }`}
                />
                {!isValidPrice(reservePrice) && (
                  <Text className="text-primary text-sm mt-1 font-lexend-regular">
                    Please enter a valid reserve price &gt;= 0
                  </Text>
                )}

                {/* Reserve Info Modal */}
                <Modal visible={showReserveInfo} transparent animationType="fade" onRequestClose={() => setShowReserveInfo(false)}>
                  <View className="flex-1 bg-black/40 justify-center items-center px-6">
                    <View className="bg-white rounded-2xl p-6 max-w-xl w-full">
                      <Text className="text-xl font-lexend-bold mb-2">Second-Price Auction</Text>
                      <Text className="mb-2 font-lexend-medium">How It Works:</Text>
                      <Text className="mb-2 text-gray-700">
                        In a second-price auction, the highest bidder wins but pays the second-highest bid amount. This encourages honest bidding—you bid your true value.
                      </Text>
                      <Text className="mb-2 font-lexend-medium">Reserve Price:</Text>
                      <Text className="mb-2 text-gray-700">
                        This is your hidden minimum. If the top bid is below it, it doesn’t sell; if above, winner pays max(second bid, reserve).
                      </Text>
                      <TouchableOpacity onPress={() => setShowReserveInfo(false)} className="mt-4 bg-primary rounded-full px-6 py-2 self-center">
                        <Text className="text-white font-lexend-medium text-center">Close</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </View>
            )}

            {/* Duration Picker */}
            <View className="mb-4">
              <Text className="text-lg font-lexend-medium mb-2">
                <Text className="text-primary">*</Text> Duration
              </Text>
              <View className="border border-gray-300 rounded-lg overflow-hidden bg-background" style={{ height: 120, justifyContent: "center" }}>
                <Picker
                  selectedValue={duration}
                  onValueChange={setDuration}
                  style={{ height: 120, width: "100%" }}
                  itemStyle={{ fontFamily: "Lexend-Regular", textAlign: "center", height: 120 }}
                >
                  {durationOptions.map(opt => (
                    <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Capture Selection */}
            <View className="mb-4">
              <Text className="text-lg font-lexend-medium mb-2">
                <Text className="text-primary">*</Text> Select Captures
              </Text>
              {capturesLoading ? (
                <ActivityIndicator size="large" color="#3B82F6" />
              ) : (
                <View className="flex-row flex-wrap">
                  {captures?.map(capture => {
                    const url = imageUrlMap[capture.image_key];
                    const selected = selectedCaptures.includes(capture.id);
                    const listed = listedCaptureIds.has(capture.id);
                    return (
                      <TouchableOpacity
                        key={capture.id}
                        onPress={() => !listed && toggleCaptureSelection(capture.id)}
                        disabled={listed}
                        className={`w-1/3 aspect-square p-1 ${selected ? "bg-primary/20" : ""}`}
                      >
                        <View className={`w-full h-full rounded-lg overflow-hidden border-2 ${listed
                          ? "border-gray-300 opacity-40"
                          : selectedCaptures.length === 0
                            ? "border-primary"
                            : "border-gray-200"
                          }`}>
                          {url ? (
                            <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                          ) : (
                            <View className="flex-1 bg-gray-100" />
                          )}

                          {listed && (
                            <View className="absolute inset-0 bg-white/60 items-center justify-center">
                              <Ionicons name="close-circle" size={32} color="#A1A1AA" />
                            </View>
                          )}

                          {selected && !listed && (
                            <>
                              <View className="absolute inset-0 bg-black/60" />
                              <View className="absolute top-2 right-2 bg-primary rounded-full p-1">
                                <Ionicons name="checkmark" size={20} color="#FFF" />
                              </View>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Create Button */}
          <View className="p-4 border-t border-gray-200">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || !isFormValid()}
              className={`py-3 rounded-full ${isSubmitting || !isFormValid() ? "bg-gray-300" : "bg-primary"
                }`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text className="text-white text-center font-lexend-medium">
                  Create Listing
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CreateListingScreen;
