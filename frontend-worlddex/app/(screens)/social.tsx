import React, { useState, useRef, useEffect } from "react";
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

const { width } = Dimensions.get("window");

interface SocialModalProps {
  visible: boolean;
  onClose: () => void;
}

const LeaderboardTab = () => {
  return (
    <View className="flex-1 justify-center items-center">
      <Ionicons name="podium-outline" size={48} color="#ccc" />
      <Text className="text-lg font-lexend-medium text-gray-400 mt-4">
        Leaderboard Coming Soon
      </Text>
    </View>
  );
};

const SocialTab = () => {
  return (
    <View className="flex-1 justify-center items-center">
      <Ionicons name="globe-outline" size={48} color="#ccc" />
      <Text className="text-lg font-lexend-medium text-gray-400 mt-4">
        Social Feed Coming Soon
      </Text>
    </View>
  );
};

const MarketplaceTab = () => {
  return (
    <View className="flex-1 justify-center items-center">
      <Ionicons name="cart-outline" size={48} color="#ccc" />
      <Text className="text-lg font-lexend-medium text-gray-400 mt-4">
        Marketplace Coming Soon
      </Text>
    </View>
  );
};

const SocialModal: React.FC<SocialModalProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState("Leaderboard");
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const currentPageRef = useRef(0);

  // Reset to Leaderboard tab when modal opens
  useEffect(() => {
    if (visible) {
      setActiveTab("Leaderboard");
      scrollX.setValue(0);
      currentPageRef.current = 0;
      // Ensure the scroll view is at position 0
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: 0, animated: false });
      }, 100);
    }
  }, [visible]);

  // Effect to update active tab based on scroll position
  useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      // Calculate which page we're on based on scroll position
      const pageIndex = Math.round(value / width);

      if (pageIndex === 0) {
        setActiveTab("Leaderboard");
        currentPageRef.current = 0;
      } else if (pageIndex === 1) {
        setActiveTab("Social");
        currentPageRef.current = 1;
      } else if (pageIndex === 2) {
        setActiveTab("Marketplace");
        currentPageRef.current = 2;
      }
    });

    return () => {
      scrollX.removeListener(listener);
    };
  }, []);

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    let pageIndex = 0;

    if (tab === "Leaderboard") {
      pageIndex = 0;
    } else if (tab === "Social") {
      pageIndex = 1;
    } else if (tab === "Marketplace") {
      pageIndex = 2;
    }

    currentPageRef.current = pageIndex;
    scrollViewRef.current?.scrollTo({
      x: pageIndex * width,
      animated: true
    });
  };

  // Create pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderRelease: (evt, gestureState) => {
        const currentPage = currentPageRef.current;

        if (gestureState.dx < -50) {
          // Swiping left - go to next tab if possible
          if (currentPage < 2) {
            const nextPage = currentPage + 1;
            const nextTab = nextPage === 1 ? "Social" : "Marketplace";
            handleTabPress(nextTab);
          }
        } else if (gestureState.dx > 50) {
          // Swiping right - go to previous tab if possible
          if (currentPage > 0) {
            const prevPage = currentPage - 1;
            const prevTab = prevPage === 0 ? "Leaderboard" : "Social";
            handleTabPress(prevTab);
          }
        }
      },
    })
  ).current;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background">
        {/* Header Tabs */}
        <View className="flex-row justify-center pt-4 pb-2">
          <View className="items-center mr-6">
            <TouchableOpacity
              onPress={() => handleTabPress("Leaderboard")}
              className="flex-row items-center"
            >
              <Text
                className={`text-lg font-lexend-bold ml-2 ${activeTab === "Leaderboard" ? "text-primary" : "text-gray-400"}`}
              >
                Leaderboard
              </Text>
            </TouchableOpacity>
            {activeTab === "Leaderboard" && (
              <View className="h-[3px] w-16 bg-primary mt-1 rounded-full" />
            )}
          </View>

          <View className="items-center mx-6">
            <TouchableOpacity
              onPress={() => handleTabPress("Social")}
              className="flex-row items-center"
            >
              <Text
                className={`text-lg font-lexend-bold ml-2 ${activeTab === "Social" ? "text-primary" : "text-gray-400"}`}
              >
                Social
              </Text>
            </TouchableOpacity>
            {activeTab === "Social" && (
              <View className="h-[3px] w-12 bg-primary mt-1 rounded-full" />
            )}
          </View>

          <View className="items-center ml-6">
            <TouchableOpacity
              onPress={() => handleTabPress("Marketplace")}
              className="flex-row items-center"
            >
              <Text
                className={`text-lg font-lexend-bold ml-2 ${activeTab === "Marketplace" ? "text-primary" : "text-gray-400"}`}
              >
                Marketplace
              </Text>
            </TouchableOpacity>
            {activeTab === "Marketplace" && (
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
            {/* Leaderboard Tab */}
            <View style={{ width, height: '100%' }}>
              <LeaderboardTab />
            </View>

            {/* Social Feed Tab */}
            <View style={{ width, height: '100%' }}>
              <SocialTab />
            </View>

            {/* Marketplace Tab */}
            <View style={{ width, height: '100%' }}>
              <MarketplaceTab />
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
      </SafeAreaView>
    </Modal>
  );
};

export default SocialModal; 