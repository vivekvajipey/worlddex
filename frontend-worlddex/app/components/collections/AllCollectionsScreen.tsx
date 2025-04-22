import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fetchAllCollections } from "../../../database/hooks/useCollections";
import { useUserCollection, fetchUserCollectionsByUser, addCollectionToUser, removeCollectionFromUser } from "../../../database/hooks/useUserCollections";
import { Collection } from "../../../database/types";
import { useAuth } from "../../../src/contexts/AuthContext";
import CollectionThumbnail from "./CollectionThumbnail";
import CollectionDetailScreen from "./CollectionDetailScreen";

interface AllCollectionsScreenProps {
  visible: boolean;
  onClose: () => void;
  onCollectionPress: (collectionId: string) => void;
}

const AllCollectionsScreen: React.FC<AllCollectionsScreenProps> = ({
  visible,
  onClose,
  onCollectionPress,
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCollectionIds, setUserCollectionIds] = useState<Set<string>>(new Set());
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  // States for collection detail view
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionDetailVisible, setCollectionDetailVisible] = useState(false);

  // Load all collections when the screen becomes visible
  useEffect(() => {
    if (visible) {
      loadCollections();
      if (userId) {
        loadUserCollections();
      }
    }
  }, [visible, userId]);

  const loadCollections = async () => {
    setLoading(true);
    try {
      // Fetch ALL collections from the collections table
      const allCollections = await fetchAllCollections(100);

      // Sort collections: featured first, then alphabetically
      const sortedCollections = allCollections.sort((a, b) => {
        // First by featured status (featured items first)
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;

        // Then alphabetically by name
        return a.name.localeCompare(b.name);
      });

      setCollections(sortedCollections);
    } catch (error) {
      console.error("Error loading collections:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch which collections the user has already added to their personal list
  const loadUserCollections = useCallback(async () => {
    if (!userId) return;

    try {
      const userCollections = await fetchUserCollectionsByUser(userId);
      const collectionIds = new Set(userCollections.map(uc => uc.collection_id));
      setUserCollectionIds(collectionIds);
    } catch (error) {
      console.error("Error loading user collections:", error);
    }
  }, [userId]);

  const toggleCollection = async (collectionId: string) => {
    if (!userId) return;

    try {
      const isAdded = userCollectionIds.has(collectionId);
      let success = false;

      if (isAdded) {
        // Remove the collection if it's already in the user's list
        success = await removeCollectionFromUser(userId, collectionId);
      } else {
        // Add the collection if it's not in the user's list
        const result = await addCollectionToUser(userId, collectionId);
        success = !!result;
      }

      if (success) {
        // Update the local state to reflect the change
        setUserCollectionIds(prev => {
          const updated = new Set(prev);
          if (isAdded) {
            updated.delete(collectionId);
          } else {
            updated.add(collectionId);
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Error toggling collection:", error);
    }
  };

  // Handler for collection press
  const handleCollectionPress = (collectionId: string) => {
    // Show collection detail modal
    setSelectedCollectionId(collectionId);
    setCollectionDetailVisible(true);
  };

  // Handler for closing detail view
  const handleCollectionDetailClose = () => {
    setCollectionDetailVisible(false);

    if (userId) {
      loadUserCollections();
    }

    // Reset after animation completes
    setTimeout(() => {
      setSelectedCollectionId(null);
    }, 300);
  };

  const renderCollectionItem = ({ item }: { item: Collection }) => {
    // Check if the user has added this collection
    const isAdded = userCollectionIds.has(item.id);

    return (
      <View className="relative">
        <CollectionThumbnail
          collection={item}
          onPress={() => handleCollectionPress(item.id)}
        />

        <View className="absolute right-6 top-4 flex-row items-center">
          {item.is_featured && (
            <View className="bg-orange-500 px-2 py-1 rounded-full mr-2">
              <Text className="text-white text-xs font-lexend-medium">
                Featured
              </Text>
            </View>
          )}

          {userId && (
            <TouchableOpacity
              className={`w-8 h-8 rounded-full justify-center items-center ${isAdded ? "bg-primary" : "bg-gray-700"}`}
              onPress={(e) => {
                e.stopPropagation();
                toggleCollection(item.id);
              }}
            >
              <Ionicons
                name={isAdded ? "checkmark" : "add"}
                size={20}
                color="#FFF"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-4">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-primary justify-center items-center absolute right-4 z-10"
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>

          <View className="flex-1 items-center">
            <Text className="text-text-primary font-lexend-bold text-xl">
              All Collections
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#FFF" />
          </View>
        ) : (
          <FlatList
            data={collections}
            keyExtractor={(item) => item.id}
            renderItem={renderCollectionItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8, paddingBottom: 20 }}
            style={{ width: "100%", flex: 1 }}
          />
        )}

        {/* Collection Detail Screen Modal */}
        {selectedCollectionId && (
          <CollectionDetailScreen
            collectionId={selectedCollectionId}
            onClose={handleCollectionDetailClose}
            visible={collectionDetailVisible}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default AllCollectionsScreen; 