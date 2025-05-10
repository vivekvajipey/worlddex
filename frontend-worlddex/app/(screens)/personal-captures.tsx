import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  ScrollView,
  SafeAreaView,
  Text,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserCaptures, fetchUserCaptures, deleteCapture, updateCapture } from "../../database/hooks/useCaptures";
import { fetchAllCollections } from "../../database/hooks/useCollections";
import { useUserCollectionsList, fetchUserCollectionsByUser } from "../../database/hooks/useUserCollections";
import { Capture, Collection } from "../../database/types";
import { useDownloadUrls } from "../../src/hooks/useDownloadUrls";

// Import the extracted components
import WorldDexTab from "../components/captures/WorldDexTab";
import CollectionsTab from "../components/collections/CollectionsTab";
import CaptureDetailsModal from "../components/captures/CaptureDetailsModal";
import CollectionDetailScreen from "../components/collections/CollectionDetailScreen";

const { width } = Dimensions.get("window");

interface CapturesModalProps {
  visible: boolean;
  onClose: () => void;
}

const CapturesModal: React.FC<CapturesModalProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState("WorldDex");
  const [selectedCapture, setSelectedCapture] = useState<Capture | null>(null);
  const [captureModalVisible, setCaptureModalVisible] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionDetailVisible, setCollectionDetailVisible] = useState(false);
  const [refreshedCaptures, setRefreshedCaptures] = useState<Capture[]>([]);
  const [userCollectionsData, setUserCollectionsData] = useState<Collection[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  // Add a ref to track if we're responding to a tab click
  const isTabClickRef = useRef(false);
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  const { captures, loading: capturesLoading } = useUserCaptures(userId);
  const { userCollections, loading: userCollectionsLoading } = useUserCollectionsList(userId);

  // Collect all image keys for batch loading - use thumb_key with fallback to image_key
  const captureImageKeys = useMemo(() => {
    const displayCaptures = refreshedCaptures.length > 0 ? refreshedCaptures : captures;
    return displayCaptures.map(capture => capture.thumb_key || capture.image_key).filter(Boolean) as string[];
  }, [refreshedCaptures, captures]);

  // Fetch all image URLs in one batch
  const { items: imageUrlItems, loading: imageUrlsLoading } = useDownloadUrls(captureImageKeys);

  // Create a map from image keys to download URLs
  const imageUrlMap = useMemo(() => {
    return Object.fromEntries(imageUrlItems.map(item => [item.key, item.downloadUrl]));
  }, [imageUrlItems]);

  // Similarly for collections, collect cover photo keys
  const collectionCoverKeys = useMemo(() => {
    return userCollectionsData
      .map(collection => collection.cover_photo_key)
      .filter(Boolean) as string[];
  }, [userCollectionsData]);

  // Fetch all collection cover URLs in one batch
  const { items: coverUrlItems, loading: coverUrlsLoading } = useDownloadUrls(collectionCoverKeys);

  // Create a map from cover keys to download URLs
  const coverUrlMap = useMemo(() => {
    return Object.fromEntries(coverUrlItems.map(item => [item.key, item.downloadUrl]));
  }, [coverUrlItems]);

  // Function to fetch full collection details for user collections
  const fetchUserCollectionDetails = useCallback(async () => {
    if (!userCollections.length) return [];

    try {
      // Get all collections
      const allCollections = await fetchAllCollections(100);

      // Filter to only include collections that the user has added
      const collectionIds = userCollections.map(uc => uc.collection_id);
      return allCollections.filter(collection => collectionIds.includes(collection.id));
    } catch (error) {
      console.error("Error fetching user collection details:", error);
      return [];
    }
  }, [userCollections]);

  // Function to refresh data from Supabase
  const refreshData = useCallback(async (showLoadingIndicator = true) => {
    if (!userId) return;

    if (showLoadingIndicator) {
      setIsRefreshing(true);
    }

    try {
      // Fetch fresh captures data
      const freshCaptures = await fetchUserCaptures(userId, 100);

      // Fetch fresh user collections data
      const userCollectionEntries = await fetchUserCollectionsByUser(userId);
      const allCollections = await fetchAllCollections(100);

      // Filter collections to only those the user has added
      const collectionIds = userCollectionEntries.map(uc => uc.collection_id);
      const userAddedCollections = allCollections.filter(
        collection => collectionIds.includes(collection.id)
      );

      // Update state with the fresh data
      setRefreshedCaptures(freshCaptures);
      setUserCollectionsData(userAddedCollections);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      if (showLoadingIndicator) {
        setIsRefreshing(false);
      }
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

  // Load user collections when they change
  useEffect(() => {
    const loadCollectionDetails = async () => {
      if (userCollections.length > 0) {
        const collections = await fetchUserCollectionDetails();
        setUserCollectionsData(collections);
      }
    };

    loadCollectionDetails();
  }, [userCollections, fetchUserCollectionDetails]);

  // Initialize refreshed data with hook data
  useEffect(() => {
    if (captures.length > 0 && refreshedCaptures.length === 0) {
      setRefreshedCaptures(captures);
    }
  }, [captures, refreshedCaptures]);

  // Effect to update active tab based on scroll position
  useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      // Skip updating the active tab if we're currently responding to a tab click
      if (isTabClickRef.current) return;

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
    setCollectionDetailVisible(true);
  };

  const handleTabPress = (tab: string) => {
    // Set the flag to indicate we're responding to a tab click
    isTabClickRef.current = true;

    // Don't update the activeTab immediately
    scrollViewRef.current?.scrollTo({
      x: tab === "WorldDex" ? 0 : width,
      animated: true
    });

    // Update activeTab after a delay to match the scroll animation
    setTimeout(() => {
      setActiveTab(tab);

      // Clear the flag after the animation is complete
      setTimeout(() => {
        isTabClickRef.current = false;
      }, 50);
    }, 200); // Most of the scroll animation duration
  };

  const handleCollectionClose = () => {
    setCollectionDetailVisible(false);

    // Use silent refresh to update data without showing loading indicator
    refreshData(false);

    // Keep this timeout to ensure the modal is fully closed before resetting the ID
    setTimeout(() => {
      setSelectedCollectionId(null);
    }, 300);
  };

  const handleCaptureDetailsClose = () => {
    setCaptureModalVisible(false);
  };

  const handleDeleteCapture = (capture: Capture) => {
    // Show confirmation alert every time
    Alert.alert(
      "Delete Capture",
      "Are you sure you want to delete this capture? This action can not be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDeleteCapture(capture)
        }
      ]
    );
  };

  const performDeleteCapture = async (capture: Capture) => {
    if (!capture.id) return;

    try {
      const success = await deleteCapture(capture.id);
      if (success) {
        // Close modal if we're deleting currently viewed capture
        if (selectedCapture?.id === capture.id) {
          setCaptureModalVisible(false);
        }

        // Update the captures list
        setRefreshedCaptures(prev => prev.filter(c => c.id !== capture.id));
      }
    } catch (error) {
      console.error("Error deleting capture:", error);
      Alert.alert("Error", "Failed to delete capture. Please try again.");
    }
  };

  // Handle updating a capture
  const handleUpdateCapture = async (capture: Capture, updates: Partial<Capture>) => {
    if (!capture.id) return;

    try {
      const updatedCapture = await updateCapture(capture.id, updates);
      if (updatedCapture) {
        // Update the captures list with the updated capture
        setRefreshedCaptures(prev =>
          prev.map(c => c.id === updatedCapture.id ? updatedCapture : c)
        );
      }
    } catch (error) {
      console.error("Error updating capture:", error);
      Alert.alert("Error", "Failed to update capture. Please try again.");
    }
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

  // Determine which captures and collections to display
  const displayCaptures = refreshedCaptures.length > 0 ? refreshedCaptures : captures;
  const displayCollections = userCollectionsData.length > 0 ? userCollectionsData : [];

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
              <WorldDexTab
                displayCaptures={displayCaptures}
                loading={capturesLoading || isRefreshing}
                urlsLoading={imageUrlsLoading}
                urlMap={imageUrlMap}
                onCapturePress={handleCapturePress}
              />
            </View>

            {/* Collections Tab */}
            <View style={{ width, height: '100%' }}>
              <CollectionsTab
                displayCollections={displayCollections}
                loading={isRefreshing || userCollectionsLoading}
                onCollectionPress={handleCollectionPress}
                refreshCollections={refreshData}
                urlsLoading={coverUrlsLoading}
                urlMap={coverUrlMap}
              />
            </View>
          </Animated.ScrollView>
        </View>

        {/* Close Button */}
        <TouchableOpacity
          className="absolute top-12 right-4 w-10 h-10 rounded-full bg-primary justify-center items-center"
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
            onDelete={handleDeleteCapture}
            onUpdate={handleUpdateCapture}
          />
        )}

        {/* Collection Detail Screen - slides up over the current screen */}
        {selectedCollectionId && (
          <CollectionDetailScreen
            collectionId={selectedCollectionId}
            onClose={handleCollectionClose}
            visible={collectionDetailVisible}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default CapturesModal;