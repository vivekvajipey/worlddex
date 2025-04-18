import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserCaptures, fetchUserCaptures } from "../../database/hooks/useCaptures";
import { useCollections, fetchAllCollections } from "../../database/hooks/useCollections";
import { Capture, Collection } from "../../database/types";

// Import the extracted components
import WorldDexTab from "../components/captures/WorldDexTab";
import CollectionsTab from "../components/captures/CollectionsTab";
import CaptureDetailsModal from "../components/captures/CaptureDetailsModal";
import CollectionDetailScreen from "../components/captures/CollectionDetailScreen";

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

  // Determine which captures and collections to display
  const displayCaptures = refreshedCaptures.length > 0 ? refreshedCaptures : captures;
  const displayCollections = refreshedCollections.length > 0 ? refreshedCollections : collections;

  // If a collection is selected, show the collection detail screen
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
              <WorldDexTab
                displayCaptures={displayCaptures}
                loading={capturesLoading || isRefreshing}
                onCapturePress={handleCapturePress}
              />
            </View>

            {/* Collections Tab */}
            <View style={{ width, height: '100%' }}>
              <CollectionsTab
                displayCollections={displayCollections}
                loading={collectionsLoading || isRefreshing}
                onCollectionPress={handleCollectionPress}
              />
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