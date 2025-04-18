import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  Animated,
  PanResponder,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUserCaptures, fetchUserCaptures } from "../../../database/hooks/useCaptures";
import { useCollections, fetchAllCollections } from "../../../database/hooks/useCollections";
import { useCollectionItems, fetchCollectionItems } from "../../../database/hooks/useCollectionItems";
import { Capture, Collection, CollectionItem } from "../../../database/types";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";

const { width } = Dimensions.get("window");

// Component for displaying a single capture thumbnail
const CaptureThumbnail = ({ capture, onPress }: { capture: Capture; onPress: () => void }) => {
  const { downloadUrl, loading } = useDownloadUrl(capture.image_key);

  return (
    <TouchableOpacity
      className="w-[32%] aspect-square m-[0.6%] rounded-lg overflow-hidden"
      onPress={onPress}
    >
      {loading ? (
        <View className="w-full h-full bg-gray-800 justify-center items-center">
          <ActivityIndicator size="small" color="#FFF" />
        </View>
      ) : (
        <View className="w-full h-full">
          <Image source={{ uri: downloadUrl || undefined }} className="w-full h-full" />
          <View className="absolute bottom-1 left-1 bg-black/50 px-2 py-1 rounded-md">
            <Text className="text-white text-xs font-lexend-medium">#{capture.capture_number}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Component for displaying the capture details modal
const CaptureDetailsModal = ({
  visible,
  capture,
  onClose,
}: {
  visible: boolean;
  capture: Capture | null;
  onClose: () => void;
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
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
      }}>
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
            <Text className="text-text-primary text-2xl font-lexend-bold mb-4 text-center">{capture.item_name}</Text>
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
            position: 'absolute',
            top: 50,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#333',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// Component for displaying a collection thumbnail
const CollectionThumbnail = ({
  collection,
  onPress,
}: {
  collection: Collection;
  onPress: () => void;
}) => {
  const { downloadUrl, loading } = useDownloadUrl(collection.cover_photo_key || "");

  return (
    <TouchableOpacity
      className="h-20 mx-4 my-2 bg-gray-800 rounded-lg overflow-hidden"
      onPress={onPress}
    >
      <View className="flex-row h-full">
        <View className="w-20 h-full">
          {loading ? (
            <View className="w-full h-full bg-gray-700 justify-center items-center">
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          ) : (
            <Image source={{ uri: downloadUrl || undefined }} className="w-full h-full" />
          )}
        </View>
        <View className="flex-1 justify-center p-3">
          <Text className="text-white font-lexend-bold text-lg">{collection.name}</Text>
          {collection.description && (
            <Text className="text-gray-300 font-lexend-regular text-xs" numberOfLines={1}>
              {collection.description}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Component for displaying a collection item
const CollectionItemThumbnail = ({ item, onPress }: { item: CollectionItem; onPress: () => void }) => {
  const { downloadUrl, loading } = useDownloadUrl(item.silhouette_key);

  return (
    <TouchableOpacity
      className="w-[32%] aspect-square m-[0.6%] rounded-lg overflow-hidden"
      onPress={onPress}
    >
      <View className="w-full h-full bg-gray-800 justify-center items-center">
        {loading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Image source={{ uri: downloadUrl || undefined }} className="w-3/4 h-3/4" resizeMode="contain" />
            <Text className="text-white text-xs font-lexend-medium mt-1" numberOfLines={1}>
              {item.display_name}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Component for displaying a collection's items
const CollectionDetailScreen = ({
  collectionId,
  onClose,
}: {
  collectionId: string;
  onClose: () => void;
}) => {
  const { collectionItems, loading: hookLoading, error: hookError } = useCollectionItems(collectionId);
  const [refreshedItems, setRefreshedItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refresh collection items when the screen is shown
  useEffect(() => {
    const refreshCollectionItems = async () => {
      try {
        setLoading(true);
        const freshItems = await fetchCollectionItems(collectionId);
        setRefreshedItems(freshItems);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load collection items"));
      } finally {
        setLoading(false);
      }
    };

    refreshCollectionItems();
  }, [collectionId]);

  // Use the hook data as fallback if refresh hasn't completed
  useEffect(() => {
    if (collectionItems.length > 0 && refreshedItems.length === 0 && !loading) {
      setRefreshedItems(collectionItems);
    }
  }, [collectionItems, refreshedItems, loading]);

  if (loading || hookLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (error || hookError) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text className="text-error">{(error || hookError)?.message}</Text>
      </View>
    );
  }

  const displayItems = refreshedItems.length > 0 ? refreshedItems : collectionItems;

  if (!displayItems.length) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text className="text-text-primary font-lexend-medium">No items in this collection.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CollectionItemThumbnail item={item} onPress={() => { }} />
          )}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: 'flex-start', paddingHorizontal: 8 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
          style={{ width: '100%', flex: 1 }}
        />
      </View>
      <TouchableOpacity
        className="absolute top-10 right-4 w-10 h-10 rounded-full bg-gray-800 justify-center items-center"
        onPress={onClose}
      >
        <Ionicons name="close" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

// Main CapturesModal component
const CapturesModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = useState("WorldDex");
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null);
  const [captureModalVisible, setCaptureModalVisible] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [refreshedCaptures, setRefreshedCaptures] = useState<Capture[]>([]);
  const [refreshedCollections, setRefreshedCollections] = useState<Collection[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  const { captures, loading: capturesLoading } = useUserCaptures(userId);
  const { collections, loading: collectionsLoading } = useCollections(true);

  // Function to refresh data from Supabase
  const refreshData = useCallback(async () => {
    if (!userId) return;

    setIsRefreshing(true);
    try {
      // Fetch fresh captures data
      const freshCaptures = await fetchUserCaptures(userId, 100);
      setRefreshedCaptures(freshCaptures);

      // Fetch fresh collections data
      const freshCollections = await fetchAllCollections(20, true);
      setRefreshedCollections(freshCollections);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId]);

  // Reset to WorldDex tab and refresh data when modal opens
  useEffect(() => {
    if (visible) {
      setActiveTab("WorldDex");
      scrollX.setValue(0);
      // Ensure the scroll view is at position 0
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: 0, animated: false });
      }, 100);

      // Refresh data from Supabase
      refreshData();
    }
  }, [visible, refreshData]);

  // Initialize refreshed data with hook data
  useEffect(() => {
    if (captures.length > 0 && refreshedCaptures.length === 0) {
      setRefreshedCaptures(captures);
    }
    if (collections.length > 0 && refreshedCollections.length === 0) {
      setRefreshedCollections(collections);
    }
  }, [captures, collections, refreshedCaptures, refreshedCollections]);

  // Effect to update active tab based on scroll position
  useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      if (value < width / 2) {
        setActiveTab("WorldDex");
      } else {
        setActiveTab("Collections");
      }
    });

    return () => {
      scrollX.removeListener(listener);
    };
  }, []);

  const handleCapturePress = (capture: Capture) => {
    setSelectedCapture(capture);
    setCaptureModalVisible(true);
  };

  const handleCollectionPress = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
  };

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({
      x: tab === "WorldDex" ? 0 : width,
      animated: true
    });
  };

  const handleCollectionClose = () => {
    setSelectedCollectionId(null);
  };

  const handleCaptureDetailsClose = () => {
    setCaptureModalVisible(false);
  };

  // Create pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50 && activeTab === "WorldDex") {
          handleTabPress("Collections");
        } else if (gestureState.dx > 50 && activeTab === "Collections") {
          handleTabPress("WorldDex");
        }
      },
    })
  ).current;

  // Render WorldDex tab content (user captures)
  const renderWorldDexTab = () => {
    if (capturesLoading || isRefreshing) {
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      );
    }

    const displayCaptures = refreshedCaptures.length > 0 ? refreshedCaptures : captures;

    if (!displayCaptures.length) {
      return (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-text-primary font-lexend-medium">No captures yet.</Text>
        </View>
      );
    }

    return (
      <View className="flex-1">
        <FlatList
          data={displayCaptures}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CaptureThumbnail capture={item} onPress={() => handleCapturePress(item)} />
          )}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: 'flex-start', paddingHorizontal: 8 }}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          style={{ width: '100%', flex: 1 }}
        />
      </View>
    );
  };

  // Render Collections tab content
  const renderCollectionsTab = () => {
    if (collectionsLoading || isRefreshing) {
      return (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      );
    }

    const displayCollections = refreshedCollections.length > 0 ? refreshedCollections : collections;

    if (!displayCollections.length) {
      return (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-text-primary font-lexend-medium">No featured collections yet.</Text>
        </View>
      );
    }

    return (
      <View className="flex-1">
        <FlatList
          data={displayCollections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CollectionThumbnail
              collection={item}
              onPress={() => handleCollectionPress(item.id)}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}
          style={{ width: '100%', flex: 1 }}
        />
      </View>
    );
  };

  if (selectedCollectionId) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <CollectionDetailScreen
          collectionId={selectedCollectionId}
          onClose={handleCollectionClose}
        />
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background">
        {/* Header Tabs */}
        <View className="flex-row justify-center pt-4 pb-2">
          <View className="items-center mr-12">
            <TouchableOpacity onPress={() => handleTabPress("WorldDex")}>
              <Text
                className={`text-lg font-lexend-bold ${activeTab === "WorldDex" ? "text-primary" : "text-gray-400"
                  }`}
              >
                WorldDex
              </Text>
            </TouchableOpacity>
            {activeTab === "WorldDex" && (
              <View className="h-[3px] w-12 bg-primary mt-1 rounded-full" />
            )}
          </View>

          <View className="items-center ml-12">
            <TouchableOpacity onPress={() => handleTabPress("Collections")}>
              <Text
                className={`text-lg font-lexend-bold ${activeTab === "Collections" ? "text-primary" : "text-gray-400"
                  }`}
              >
                Collections
              </Text>
            </TouchableOpacity>
            {activeTab === "Collections" && (
              <View className="h-[3px] w-12 bg-primary mt-1 rounded-full" />
            )}
          </View>
        </View>

        {/* Scrollable content */}
        <View className="flex-1">
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            {...panResponder.panHandlers}
            className="flex-1"
          >
            {/* WorldDex Tab */}
            <View style={{ width, height: '100%' }}>
              {renderWorldDexTab()}
            </View>

            {/* Collections Tab */}
            <View style={{ width, height: '100%' }}>
              {renderCollectionsTab()}
            </View>
          </Animated.ScrollView>
        </View>

        {/* Close Button */}
        <TouchableOpacity
          className="absolute top-12 right-4 w-10 h-10 rounded-full bg-gray-800 justify-center items-center"
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>

        {/* Capture Details Modal - shown on top of everything else when visible */}
        {captureModalVisible && selectedCapture && (
          <CaptureDetailsModal
            visible={captureModalVisible}
            capture={selectedCapture}
            onClose={handleCaptureDetailsClose}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default CapturesModal; 