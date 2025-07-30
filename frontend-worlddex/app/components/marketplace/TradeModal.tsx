import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Listing, Capture } from "../../../database/types";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUser } from "../../../database/hooks/useUsers";
import { supabase } from "../../../database/supabase-client";
import { useTradeOffers } from "../../../database/hooks/useTradeOffers";
import { useTradeOfferItemsWithCaptures, fetchTradeOfferItemsWithCaptures } from "../../../database/hooks/useTradeOfferItems";
import { formatDistanceToNow } from "date-fns";
import { useDownloadUrls } from "../../../src/hooks/useDownloadUrls";
import { useListings } from "../../../database/hooks/useListings";
import { fetchTradeOfferItemsByTradeOfferId } from "../../../database/hooks/useTradeOfferItems";
import { usePostHog } from "posthog-react-native";
import { useAlert } from "../../../src/contexts/AlertContext";

interface TradeModalProps {
  visible: boolean;
  onClose: () => void;
  listing: Listing;
  /** Current user's captures to offer */
  userCaptures: Capture[];
  onTradePlaced?: () => void;
  onListingChanged?: () => void;
}

const TradeModal: React.FC<TradeModalProps> = ({
  visible,
  onClose,
  listing,
  userCaptures,
  onTradePlaced,
  onListingChanged,
}) => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { user: currentUser } = useUser(userId || null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const posthog = usePostHog();
  const { showAlert } = useAlert();

  useEffect(() => {
    // Track screen view when modal becomes visible
    if (visible && listing && posthog) {
      posthog.screen("Trade-Modal", {
        listingId: listing.id,
      });
    }
  }, [visible, listing, posthog]);

  // Get existing trade offers
  const { tradeOffers, loading: offersLoading } = useTradeOffers(listing.id, null);
  const existingOffer = tradeOffers?.find(offer =>
    offer.offerer_id === userId && offer.status === "pending"
  );

  const isSeller = userId === listing.seller_id;
  const isExpired = listing.expires_at ? new Date(listing.expires_at) < new Date() : false;

  // Get all pending offers for this listing
  const pendingOffers = useMemo(() => tradeOffers?.filter(offer => offer.status === "pending") || [], [tradeOffers]);

  // Batch fetch offerer users (local effect, not a hook)
  const offererIds = useMemo(() => Array.from(new Set(pendingOffers.map(o => o.offerer_id))), [pendingOffers]);
  const [offererMap, setOffererMap] = useState<Record<string, any>>({});
  useEffect(() => {
    if (offererIds.length === 0) return;
    let isMounted = true;
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("id", offererIds);
      if (!error && isMounted && data) {
        const map: Record<string, any> = {};
        data.forEach((u: any) => { map[u.id] = u; });
        setOffererMap(map);
      }
    };
    fetchUsers();
    return () => { isMounted = false; };
  }, [JSON.stringify(offererIds)]);

  // Batch fetch offerer profile image URLs
  const offererProfileKeys = useMemo(() =>
    Object.values(offererMap)
      .map((u: any) => u?.profile_picture_key)
      .filter(Boolean) as string[],
    [offererMap]
  );
  const { items: offererProfileUrlItems } = useDownloadUrls(offererProfileKeys);
  const offererProfileUrlMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.values(offererMap).forEach((u: any) => {
      if (u?.profile_picture_key) {
        const urlObj = offererProfileUrlItems.find(i => i.key === u.profile_picture_key);
        if (urlObj?.downloadUrl) {
          map[u.id] = urlObj.downloadUrl;
        }
      }
    });
    return map;
  }, [offererMap, offererProfileUrlItems]);

  // Map of offerId -> items with captures
  const [offerItemsMap, setOfferItemsMap] = useState<{ [offerId: string]: { tradeOfferItem: any, capture: Capture }[] }>({});
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    if (!isSeller || pendingOffers.length === 0) return;
    let isMounted = true;
    setItemsLoading(true);
    const fetchAll = async () => {
      const map: { [offerId: string]: { tradeOfferItem: any, capture: Capture }[] } = {};
      for (const offer of pendingOffers) {
        const items = await fetchTradeOfferItemsWithCaptures(offer.id);
        map[offer.id] = items || [];
      }
      if (isMounted) setOfferItemsMap(map);
      setItemsLoading(false);
    };
    fetchAll();
    return () => { isMounted = false; };
  }, [isSeller, pendingOffers]);

  // Collect all image keys for batch download
  const imageKeys = useMemo(() => {
    const keys = new Set<string>();
    // Add userCaptures (for buyer modal)
    userCaptures.forEach(capture => {
      if (capture.image_key) keys.add(capture.image_key);
    });
    // Add offer items (for seller modal)
    Object.values(offerItemsMap).forEach(items => {
      items.forEach(({ capture }) => {
        if (capture.image_key) keys.add(capture.image_key);
      });
    });
    return Array.from(keys);
  }, [userCaptures, offerItemsMap]);

  const { items: imageUrlItems } = useDownloadUrls(imageKeys);
  const imageUrlMap = useMemo(() => {
    const map: Record<string, string> = {};
    imageUrlItems.forEach(item => {
      if (item.downloadUrl) map[item.key] = item.downloadUrl;
    });
    return map;
  }, [imageUrlItems]);

  // For buyer: load selected captures from existing offer
  useEffect(() => {
    if (!isSeller && existingOffer) {
      let isMounted = true;
      const fetchItems = async () => {
        const items = await fetchTradeOfferItemsWithCaptures(existingOffer.id);
        if (isMounted && items) {
          setSelectedIds(items.map(item => item.capture.id));
        }
      };
      fetchItems();
      return () => { isMounted = false; };
    } else if (!existingOffer) {
      setSelectedIds([]);
    }
  }, [isSeller, existingOffer]);

  // Fetch all of the user's active listings
  const { listings: userActiveListings } = useListings({ sellerId: userId, status: "active" });
  // Fetch all of the user's pending trade offers and their items
  const { tradeOffers: userTradeOffers } = useTradeOffers(null, userId);
  const [pendingTradeCaptureIds, setPendingTradeCaptureIds] = useState<string[]>([]);
  useEffect(() => {
    let isMounted = true;
    const fetchAllTradeOfferItems = async () => {
      if (!userTradeOffers) return;
      const pendingOffers = userTradeOffers.filter(offer => offer.status === "pending");
      let allCaptureIds: string[] = [];
      for (const offer of pendingOffers) {
        const items = await fetchTradeOfferItemsByTradeOfferId(offer.id);
        if (items) {
          allCaptureIds = allCaptureIds.concat(items.map(item => item.capture_id));
        }
      }
      if (isMounted) setPendingTradeCaptureIds(allCaptureIds);
    };
    fetchAllTradeOfferItems();
    return () => { isMounted = false; };
  }, [userTradeOffers]);

  // Collect all capture IDs that should be disabled (in active listings or pending trade offers)
  const disabledCaptureIds = useMemo(() => {
    const ids = new Set<string>();
    // Captures in user's active listings
    userActiveListings.forEach(listing => {
      listing.listing_items?.forEach(item => {
        if (item.captures?.id) ids.add(item.captures.id);
      });
    });
    // Captures in user's own pending trade offers
    pendingTradeCaptureIds.forEach(id => ids.add(id));
    return ids;
  }, [userActiveListings, pendingTradeCaptureIds]);

  // Place or update an offer
  const handlePlaceTrade = async () => {
    if (!userId) {
      Alert.alert("Error", "You must be logged in to make a trade offer");
      return;
    }
    if (selectedIds.length === 0) {
      Alert.alert("Error", "Select at least one item to offer");
      return;
    }
    setIsProcessing(true);
    try {
      if (existingOffer) {
        // Update existing offer
        const { error: updateError } = await supabase.rpc("update_trade_offer", {
          p_trade_offer_id: existingOffer.id,
          p_offered_capture_ids: selectedIds,
          p_message: message
        });
        if (updateError) throw updateError;
      } else {
        // Create new offer
        const { error: createError } = await supabase.rpc("place_trade_offer", {
          p_listing_id: listing.id,
          p_trader_id: userId,
          p_offered_capture_ids: selectedIds,
          p_message: message
        });
        if (createError) throw createError;
      }
      onTradePlaced?.();
      onClose();
      if (posthog) {
        posthog.capture("marketplace_trade_offer_created", {
          listingId: listing.id,
          itemCount: selectedIds.length
        });
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to place offer");
      if (posthog) {
        posthog.capture("marketplace_trade_offer_failed", {
          listingId: listing.id,
          error: e.message || "Unknown error"
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Retract offer
  const handleRetractTrade = () => {
    if (!existingOffer) return;
    showAlert({
      title: "Retract Offer",
      message: "Cancel your offer?",
      icon: "arrow-undo-outline",
      iconColor: "#F59E0B",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retract",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              const { error } = await supabase.rpc("retract_trade_offer", {
                p_trade_offer_id: existingOffer.id,
                p_trader_id: userId,
              });
              if (error) throw error;
              onTradePlaced?.();
              onClose();
            } catch (e: any) {
              showAlert({
                title: "Error",
                message: e.message || "Failed to retract",
                icon: "alert-circle-outline",
                iconColor: "#EF4444"
              });
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    });
  };

  // Accept offer
  const handleAccept = async (offerId: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("accept_trade_offer", {
        p_trade_offer_id: offerId,
        p_seller_id: userId,
      });
      if (error) throw error;
      onTradePlaced?.();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to accept");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject offer
  const handleReject = async (offerId: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc("reject_trade_offer", {
        p_trade_offer_id: offerId,
        p_seller_id: userId,
      });
      if (error) throw error;
      onTradePlaced?.();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to reject");
    } finally {
      setIsProcessing(false);
    }
  };

  // If seller, show pending offers
  if (isSeller) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={{ flex: 1 }} onPress={() => { }}>
          <View className="flex-1 bg-black/40 justify-center items-center px-4" pointerEvents="box-none">
            <View className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh]" pointerEvents="box-only">
              {/* Header */}
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-lexend-bold">Trade Offers</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              {offersLoading || itemsLoading ? (
                <View className="flex-1 justify-center items-center py-8">
                  <ActivityIndicator size="large" color="#F97316" />
                  <Text className="text-gray-500 mt-2 font-lexend-medium">
                    Loading offers...
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ minHeight: 200, maxHeight: 400 }}>
                  {pendingOffers.map((offer) => {
                    const offerer = offererMap[offer.offerer_id];
                    return (
                      <View key={offer.id} className="bg-gray-50 rounded-lg p-4 mb-4">
                        {/* Offerer info row */}
                        <View className="flex-row items-center mb-2">
                          {offerer?.profile_picture_key ? (
                            <Image
                              source={offererProfileUrlMap[offerer.id] ? { uri: offererProfileUrlMap[offerer.id] } : undefined}
                              style={{ width: 36, height: 36, borderRadius: 18, marginRight: 8 }}
                              contentFit="cover"
                            />
                          ) : (
                            <View className="w-9 h-9 rounded-full bg-gray-200 mr-2" />
                          )}
                          <View className="flex-1">
                            <Text className="font-lexend-medium text-text-primary">
                              {offerer?.username || "Unknown"}
                            </Text>
                            <Text className="font-lexend-regular text-gray-500 text-xs">
                              {formatDistanceToNow(new Date(offer.created_at || new Date()), { addSuffix: true })}
                            </Text>
                          </View>
                        </View>
                        {offer.message && (
                          <Text className="text-gray-600 mb-4">{offer.message}</Text>
                        )}
                        {/* Captures Carousel */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                          {offerItemsMap[offer.id]?.map(({ capture }) => {
                            const imageUrl = imageUrlMap[capture.image_key];
                            return (
                              <View key={capture.id} className="w-24 h-28 mr-2 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                {imageUrl ? (
                                  <Image
                                    source={{ uri: imageUrl }}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="cover"
                                  />
                                ) : (
                                  <View className="flex-1 bg-gray-200" />
                                )}
                              </View>
                            );
                          })}
                        </ScrollView>
                        <View className="flex-row justify-end space-x-2">
                          <TouchableOpacity
                            onPress={() => handleReject(offer.id)}
                            className="bg-red-100 px-4 py-2 rounded-full"
                          >
                            <Text className="text-red-600 font-lexend-medium">Reject</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleAccept(offer.id)}
                            className="bg-primary px-4 py-2 rounded-full"
                          >
                            <Text className="text-white font-lexend-medium">Accept</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </Pressable>
      </Modal>
    );
  }

  // If buyer, show offer creation UI
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={{ flex: 1 }} onPress={() => { }}>
        <View className="flex-1 bg-black/40 justify-center items-center px-4" pointerEvents="box-none">
          <View className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-full" pointerEvents="box-only">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-lexend-bold">
                {isSeller
                  ? "Review Trade Offers"
                  : existingOffer
                    ? "Update Trade Offer"
                    : "Make Trade Offer"}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {isExpired ? (
              <Text className="text-error text-center">
                This listing has expired.
              </Text>
            ) : (
              <>
                {userCaptures.length === 0 ? (
                  <Text>You have no items to offer.</Text>
                ) : (
                  <ScrollView className="max-h-[300px]">
                    <View className="flex-row flex-wrap">
                      {userCaptures.map(capture => {
                        const sel = selectedIds.includes(capture.id);
                        const disabled = disabledCaptureIds.has(capture.id);
                        const imageUrl = imageUrlMap[capture.image_key];
                        return (
                          <TouchableOpacity
                            key={capture.id}
                            onPress={() => {
                              if (disabled) return;
                              if (sel) setSelectedIds((s) => s.filter((i) => i !== capture.id));
                              else setSelectedIds((s) => [...s, capture.id]);
                            }}
                            disabled={disabled}
                            className={`w-1/3 aspect-square p-1 ${sel ? "bg-primary/20" : ""}`}
                          >
                            <View className={`w-full h-full rounded-lg overflow-hidden border ${disabled ? "border-gray-300 opacity-40" : sel ? "border-primary" : "border-gray-200"}`}>
                              <Image
                                source={imageUrl ? { uri: imageUrl } : undefined}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                              />
                              {sel && (
                                <View className="absolute inset-0 bg-primary/20 items-center justify-center">
                                  <Ionicons name="checkmark-circle" size={24} color="#F97316" />
                                </View>
                              )}
                              {disabled && (
                                <View className="absolute inset-0 bg-white/60 items-center justify-center">
                                  <Ionicons name="close-circle" size={32} color="#A1A1AA" />
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}

                <View className="flex-row mt-4">
                  {existingOffer && (
                    <TouchableOpacity
                      onPress={handleRetractTrade}
                      disabled={isProcessing}
                      className="flex-1 bg-error mr-2 py-2 rounded-full"
                    >
                      <Text className="text-white text-center font-lexend-medium">
                        Retract Offer
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handlePlaceTrade}
                    disabled={isProcessing || selectedIds.length === 0}
                    className={`flex-1 py-2 rounded-full ${isProcessing || selectedIds.length === 0 ? 'bg-gray-300' : 'bg-primary'}`}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text className="text-white text-center font-lexend-medium">
                        {existingOffer ? 'Update Offer' : 'Send Offer'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

export default TradeModal;
