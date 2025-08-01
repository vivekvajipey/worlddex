import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ActivityIndicator, FlatList, TouchableOpacity, SafeAreaView, Modal, Switch } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useCollectionItems, fetchCollectionItems } from "../../../database/hooks/useCollectionItems";
import { useCollection } from "../../../database/hooks/useCollections";
import { checkUserHasCollectionItem, fetchUserCollectionItemsByCollection } from "../../../database/hooks/useUserCollectionItems";
import { useUserCollection, addCollectionToUser, removeCollectionFromUser, fetchUserCollection } from "../../../database/hooks/useUserCollections";
import { CollectionItem, Capture } from "../../../database/types";
import CollectionItemThumbnail from "./CollectionItemThumbnail";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { useDownloadUrls } from "../../../src/hooks/useDownloadUrls";
import { deleteCollection } from "../../../database/hooks/useCollections";
import { calculateAndAwardCoins } from "../../../database/hooks/useCoins";
import CoinRewardModal from "../CoinRewardModal";
import { usePostHog } from "posthog-react-native";
import { useAlert } from "../../../src/contexts/AlertContext";

interface CollectionDetailScreenProps {
  collectionId: string;
  onClose: () => void;
  visible: boolean;
}

const CollectionDetailScreen: React.FC<CollectionDetailScreenProps> = ({
  collectionId,
  onClose,
  visible,
}) => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { collectionItems, loading: itemsLoading, error: itemsError } = useCollectionItems(collectionId);
  const { collection, loading: collectionLoading, error: collectionError } = useCollection(collectionId);
  const [refreshedItems, setRefreshedItems] = useState<CollectionItem[]>([]);
  const [collectedItemIds, setCollectedItemIds] = useState<Set<string>>(new Set());
  const [userCollectionData, setUserCollectionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [collectionProgress, setCollectionProgress] = useState({ collected: 0, total: 0 });
  const [isInUserCollection, setIsInUserCollection] = useState(false);
  const [isActiveCollection, setIsActiveCollection] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [activeToggleLoading, setActiveToggleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCoinReward, setShowCoinReward] = useState(false);
  const [coinReward, setCoinReward] = useState<{ total: number; rewards: { amount: number; reason: string }[] }>({ total: 0, rewards: [] });

  const posthog = usePostHog();
  const { showAlert } = useAlert();

  useEffect(() => {
    // Track screen view when component mounts
    if (collection && posthog) {
      posthog.screen("Collection-Detail", {
        collectionId: collection.id,
        collectionName: collection.name
      });
    }
  }, [collection, posthog]);

  // Get keys for all collection items - use thumb_key with fallback to silhouette_key
  const itemImageKeys = useMemo(() => {
    const displayItems = refreshedItems.length > 0 ? refreshedItems : collectionItems;
    return displayItems.map(item => item.thumb_key || item.silhouette_key).filter(Boolean) as string[];
  }, [refreshedItems, collectionItems]);

  // Fetch all item image URLs in one batch request
  const { items: itemUrlData, loading: itemUrlsLoading } = useDownloadUrls(itemImageKeys);

  // Create a mapping from keys to URLs for easy lookup
  const itemUrlMap = useMemo(() => {
    return Object.fromEntries(itemUrlData.map(item => [item.key, item.downloadUrl]));
  }, [itemUrlData]);

  const { downloadUrl: coverUrl, loading: coverLoading } = useDownloadUrl(collection?.cover_photo_key || "");
  const [coverImageError, setCoverImageError] = useState(false);

  // Default cover image 
  const defaultCoverImage = require("../../../assets/images/WorldDex Horizontal.png");

  // Refresh collection items when the screen is shown
  useEffect(() => {
    const refreshCollectionItems = async () => {
      try {
        setLoading(true);
        const freshItems = await fetchCollectionItems(collectionId);
        setRefreshedItems(freshItems);
        setCollectionProgress(prev => ({ ...prev, total: freshItems.length }));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load collection items"));
      } finally {
        setLoading(false);
      }
    };

    refreshCollectionItems();
  }, [collectionId]);

  // Check if collection is in user's personal collection
  useEffect(() => {
    const checkUserCollection = async () => {
      if (!userId || !collectionId) return;

      try {
        const userCollection = await fetchUserCollection(userId, collectionId);
        setIsInUserCollection(!!userCollection);

        // If we have a user collection, set the active status
        if (userCollection) {
          setIsActiveCollection(!!userCollection.is_active);
        }
      } catch (err) {
        console.error("Error checking user collection:", err);
      }
    };

    checkUserCollection();
  }, [userId, collectionId]);

  // Use the hook data as fallback if refresh hasn't completed
  useEffect(() => {
    if (collectionItems.length > 0 && refreshedItems.length === 0 && !loading) {
      setRefreshedItems(collectionItems);
      setCollectionProgress(prev => ({ ...prev, total: collectionItems.length }));
    }
  }, [collectionItems, refreshedItems, loading]);

  // Fetch user's collection data with captures for rarity information
  useEffect(() => {
    const fetchUserCollectionData = async () => {
      if (!userId || !collectionId) return;

      try {
        const userCollectionItems = await fetchUserCollectionItemsByCollection(userId, collectionId);
        setUserCollectionData(userCollectionItems);
        
        // Set collected item IDs
        const collectedIds = new Set(userCollectionItems.map((item: any) => item.collection_item_id));
        setCollectedItemIds(collectedIds);
        setCollectionProgress(prev => ({ ...prev, collected: collectedIds.size }));

        // Check if user has completed the collection and award coins if applicable
        if (collectedIds.size === refreshedItems.length && refreshedItems.length >= 2) {
          const reward = await calculateAndAwardCoins(userId, collectionId);
          if (reward.total > 0) {
            setCoinReward(reward);
            setShowCoinReward(true);
          }
        }
      } catch (err) {
        console.error("Error fetching user collection data:", err);
      }
    };

    fetchUserCollectionData();
  }, [userId, collectionId, refreshedItems.length]);

  // Create a mapping from collection item ID to capture rarity
  const itemRarityMap = useMemo(() => {
    const rarityMap = new Map<string, string>();
    
    userCollectionData.forEach((userItem: any) => {
      if (userItem.captures && userItem.captures.rarity_tier) {
        rarityMap.set(userItem.collection_item_id, userItem.captures.rarity_tier);
      }
    });
    
    return rarityMap;
  }, [userCollectionData]);

  const toggleCollection = async () => {
    if (!userId || !collectionId) return;

    setToggleLoading(true);
    try {
      let success = false;

      if (isInUserCollection) {
        // Remove collection
        success = await removeCollectionFromUser(userId, collectionId);
      } else {
        // Add collection
        const result = await addCollectionToUser(userId, collectionId);
        success = !!result;
      }

      if (success) {
        // Update state
        setIsInUserCollection(!isInUserCollection);
        // If we're adding a collection, default active to true
        if (!isInUserCollection) {
          setIsActiveCollection(true);
        }
      }
    } catch (error) {
      console.error("Error toggling collection:", error);
    } finally {
      setToggleLoading(false);
    }
  };

  // Check if current user is the creator of this collection
  const isCollectionCreator = userId && collection && collection.created_by === userId;

  const handleDeleteCollection = () => {
    if (!collection) return;

    showAlert({
      title: "Delete Collection",
      message: `Are you sure you want to delete "${collection.name}"? This action cannot be undone.`,
      icon: "trash-outline",
      iconColor: "#EF4444",
      buttons: [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleteLoading(true);
            try {
              const success = await deleteCollection(collectionId);
              if (success) {
                // Close the detail screen and navigate back
                onClose();
              } else {
                showAlert({
                  title: "Error",
                  message: "Failed to delete the collection. Please try again.",
                  icon: "alert-circle-outline",
                  iconColor: "#EF4444"
                });
              }
            } catch (error) {
              console.error("Error deleting collection:", error);
              showAlert({
                title: "Error",
                message: "An unexpected error occurred.",
                icon: "alert-circle-outline",
                iconColor: "#EF4444"
              });
            } finally {
              setDeleteLoading(false);
            }
          }
        }
      ]
    });
  };

  const isLoading = loading || itemsLoading || collectionLoading;
  const hasError = error || itemsError || collectionError;

  // Sort items alphabetically by display_name
  const displayItems = useMemo(() => {
    const items = [...(refreshedItems.length > 0 ? refreshedItems : collectionItems)];
    return items.sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [refreshedItems, collectionItems]);

  // Check if an item is collected by the user
  const isItemCollected = (itemId: string) => {
    return collectedItemIds.has(itemId);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View className="flex-1 justify-center items-center bg-background">
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      );
    }

    if (hasError) {
      return (
        <View className="flex-1 justify-center items-center bg-background p-4">
          <Text className="text-error">{(error || itemsError || collectionError)?.message}</Text>
        </View>
      );
    }

    return (
      <SafeAreaView className="flex-1 bg-background">
        {/* Header with background image */}
        <View className="w-full">
          <View className="w-full aspect-[3/1] relative">
            {coverLoading ? (
              <View className="w-full h-full bg-black/50 justify-center items-center">
                <Image
                  source={defaultCoverImage}
                  style={{ width: '100%', height: '100%', opacity: 0.3 }}
                  contentFit="cover"
                />
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            ) : (
              <View className="w-full h-full">
                {collection?.cover_photo_key && coverUrl && !coverImageError ? (
                  <Image
                    source={{ uri: coverUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    onError={() => setCoverImageError(true)}
                    transition={300}
                  />
                ) : (
                  <Image
                    source={defaultCoverImage}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                )}

                {/* Semi-transparent overlay for better text readability */}
                <View className="absolute inset-0 bg-black/50" />
              </View>
            )}

            {/* Close button (X) in top right */}
            <TouchableOpacity
              className="absolute top-8 right-4 z-10 w-10 h-10 rounded-full bg-primary/80 justify-center items-center"
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>

            {/* Delete button (trash can) in top left - only shown if user is the creator */}
            {isCollectionCreator && (
              <TouchableOpacity
                className="absolute top-8 left-4 z-10 w-10 h-10 rounded-full bg-red-500/80 justify-center items-center"
                onPress={handleDeleteCollection}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="trash" size={20} color="#FFF" />
                )}
              </TouchableOpacity>
            )}

            {/* Collection header */}
            <View className="absolute inset-0 flex-1 px-4 pt-8 pb-2 justify-end">
              <View className="items-center mb-6">
                <Text className="text-white font-lexend-bold text-2xl text-center">
                  {collection?.name || "Collection"}
                </Text>

                {collection?.description && (
                  <Text className="text-white/80 font-lexend-regular text-sm text-center mt-2 px-8">
                    {collection.description}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {!displayItems.length ? (
          <View className="flex-1 justify-center items-center bg-background p-4">
            <Text className="text-text-primary font-lexend-medium">No items in this collection.</Text>
          </View>
        ) : (
          <>
            <View className="px-4 py-3">
              <Text className="text-text-secondary font-lexend-regular text-sm text-center">
                {collectionProgress.collected} of {collectionProgress.total} items collected
              </Text>
            </View>
            <FlatList
              data={displayItems}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <CollectionItemThumbnail
                  item={item}
                  onPress={() => { }}
                  isCollected={isItemCollected(item.id)}
                  loading={itemUrlsLoading}
                  downloadUrl={itemUrlMap[item.thumb_key || item.silhouette_key] || null}
                  captureRarity={itemRarityMap.get(item.id) as "common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary" || null}
                />
              )}
              numColumns={3}
              columnWrapperStyle={{ justifyContent: 'flex-start', paddingHorizontal: 8 }}
              contentContainerStyle={{ paddingTop: 0, paddingBottom: 80 }}
              showsVerticalScrollIndicator={false}
              style={{ width: '100%', flex: 1 }}
            />
          </>
        )}

        {/* Collection Controls */}
        {userId && (
          <View className="absolute bottom-8 left-4 right-4 space-y-3">

            {/* Add/Remove Collection Button */}
            <TouchableOpacity
              className={`h-12 rounded-lg justify-center items-center ${isInUserCollection ? "bg-red-500" : "bg-primary"
                }`}
              onPress={toggleCollection}
              disabled={toggleLoading}
            >
              {toggleLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text className="text-white font-lexend-bold text-base">
                  {isInUserCollection ? "Remove Collection" : "Add Collection"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {renderContent()}
      <CoinRewardModal
        visible={showCoinReward}
        onClose={() => setShowCoinReward(false)}
        total={coinReward.total}
        rewards={coinReward.rewards}
      />
      
    </Modal>
  );
};

export default CollectionDetailScreen;