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
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CaptureLeaderboard from "../components/leaderboard/CaptureLeaderboard";
import CollectionLeaderboards from "../components/leaderboard/CollectionLeaderboards";
import { useTopCaptures } from "../../database/hooks/useCaptures";
import CapturePost from "../components/social/CapturePost";
import { useDownloadUrls } from "../../src/hooks/useDownloadUrls";
import MarketplaceFeed from "../components/marketplace/MarketplaceFeed";
import { Listing } from "../../database/types";
import CreateListingScreen from "../components/marketplace/CreateListingScreen";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUser } from "../../database/hooks/useUsers";
import { Image } from "expo-image";
import retroCoin from "../../assets/images/retro_coin.png";
import { supabase } from "../../database/supabase-client";
import { usePostHog } from "posthog-react-native";
import OfflineIndicator from "../components/OfflineIndicator";

const { width } = Dimensions.get("window");

interface SocialModalProps {
  visible: boolean;
  onClose: () => void;
}

const LeaderboardTab = () => {

  return (
    <View className="flex-1 p-2">
      <ScrollView showsVerticalScrollIndicator={false}>
        <CaptureLeaderboard />

        <View className="px-4 py-6">
          <View className="border-t border-gray-200" />
        </View>

        <View>
          <Text className="text-xl font-lexend-bold mb-4 text-center">Collection Leaderboards</Text>
          <CollectionLeaderboards />
        </View>
      </ScrollView>
    </View>
  );
};

const SocialTab = () => {

  // Use the top captures hook with pagination
  const {
    captures,
    loading,
    error,
    refreshData,
    fetchNextPage,
    hasMore,
    page,
    pageCount,
  } = useTopCaptures({
    limit: 10,
    minUpvotes: 0
  });

  // Collect all image keys from the captures for batch download
  const imageKeys = useMemo(() => {
    return captures.map(capture => capture.image_key).filter(Boolean) as string[];
  }, [captures]);

  // Fetch all image URLs in batch
  const { items: imageUrlItems, loading: imageUrlsLoading } = useDownloadUrls(imageKeys);

  // Create a mapping from image keys to download URLs
  const imageUrlMap = useMemo(() => {
    return Object.fromEntries(imageUrlItems.map(item => [item.key, item.downloadUrl]));
  }, [imageUrlItems]);

  // Event handlers
  const handleUserPress = useCallback((userId: string) => {
    // Navigate to user profile (implementation depends on app structure)
    console.log("Navigate to user profile:", userId);
    // We'll implement proper navigation when routes are set up
  }, []);

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text className="text-gray-500 mt-2 font-lexend-regular">
          Loading more...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View className="py-20 items-center">
        <Ionicons name="images-outline" size={64} color="#CBD5E1" />
        <Text className="text-gray-400 mt-4 text-lg font-lexend-medium text-center">
          No captures found
        </Text>
        <Text className="text-gray-400 mt-2 text-center max-w-xs font-lexend-regular">
          Be the first to share your captures with the world!
        </Text>
      </View>
    );
  };

  // Show offline indicator if there's a network error
  if (error && captures.length === 0) {
    return <OfflineIndicator message="Social feed unavailable offline" showSubtext={false} />;
  }


  return (
    <View className="flex-1 bg-background">
      {/* Feed */}
      <FlatList
        data={captures}
        keyExtractor={(item) => item.id || item.image_key}
        renderItem={({ item }) => (
          <CapturePost
            capture={item}
            onUserPress={handleUserPress}
            imageUrl={imageUrlMap[item.image_key]}
            imageLoading={imageUrlsLoading}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
          flexGrow: captures.length === 0 ? 1 : undefined
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading && page === 1}
            onRefresh={refreshData}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
        onEndReached={() => {
          if (!loading && hasMore) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />

      {/* Pagination indicator */}
      {pageCount > 1 && (
        <View className="absolute bottom-4 left-0 right-0 items-center">
          <View className="bg-gray-800/70 px-4 py-2 rounded-full">
            <Text className="text-white font-lexend-medium">
              Page {page} of {pageCount}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const MarketplaceTab = () => {
  const { session } = useAuth();
  const { user } = useUser(session?.user?.id || null);
  const [localBalance, setLocalBalance] = useState(user?.balance ?? 0);
  useEffect(() => {
    setLocalBalance(user?.balance ?? 0);
  }, [user?.balance]);

  const refreshUserBalance = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("users")
      .select("balance")
      .eq("id", user.id)
      .single();
    if (!error && data) setLocalBalance(data.balance);
  };

  const [createListingVisible, setCreateListingVisible] = useState(false);
  const [marketplaceFeedKey, setMarketplaceFeedKey] = useState(0);
  const [marketplaceRefreshKey, setMarketplaceRefreshKey] = useState(0);

  const handleMarketplaceRefresh = () => {
    setMarketplaceRefreshKey((k) => k + 1);
    refreshUserBalance();
  };

  const refreshMarketplaceFeed = () => {
    setMarketplaceFeedKey((k) => k + 1);
  };

  const handleUserPress = (userId: string) => {
    // Navigate to user profile
    console.log("Navigate to user profile:", userId);
  };


  return (
    <View className="flex-1 bg-background">
      {/* Floating user balance icon */}
      <View style={{ position: "absolute", top: 10, right: 20, zIndex: 20 }}>
        <View className="flex-row items-center justify-center bg-accent-200 border border-primary rounded-full px-3 py-1 shadow-md" style={{ minWidth: 54 }}>
          <Image
            source={retroCoin}
            style={{ width: 22, height: 22, marginRight: 4 }}
            contentFit="contain"
          />
          <Text className="text-primary font-lexend-bold text-lg">{localBalance}</Text>
        </View>
      </View>
      <MarketplaceFeed
        onUserBalanceChanged={refreshUserBalance}
        onRefreshed={handleMarketplaceRefresh}
        key={marketplaceFeedKey}
        refreshKey={marketplaceRefreshKey}
        onUserPress={handleUserPress}
      />

      {/* Create Listing FAB */}
      <TouchableOpacity
        onPress={() => setCreateListingVisible(true)}
        className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-primary justify-center items-center shadow-lg"
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* Create Listing Modal */}
      <CreateListingScreen
        visible={createListingVisible}
        onClose={() => setCreateListingVisible(false)}
        onListingCreated={refreshMarketplaceFeed}
      />
    </View>
  );
};

const SocialModal: React.FC<SocialModalProps> = ({ visible, onClose }) => {
  const posthog = usePostHog();

  useEffect(() => {
    // Track screen view when modal becomes visible
    if (visible && posthog) {
      posthog.screen("Social");
    }
  }, [visible, posthog]);

  // Changed initial state to "Social" instead of "Leaderboard"
  const [activeTab, setActiveTab] = useState("Social");
  const scrollX = useRef(new Animated.Value(width)).current; // Initialize to width (Social tab position)
  const scrollViewRef = useRef<ScrollView>(null);
  const currentPageRef = useRef(1); // Initialize to 1 (Social tab index)
  // Add a ref to track if we're responding to a tab click
  const isTabClickRef = useRef(false);

  // Track tab changes
  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName);
  };

  // Reset to Social tab when modal opens
  useEffect(() => {
    if (visible) {
      setActiveTab("Social");
      scrollX.setValue(width); // Set to width (Social tab position)
      currentPageRef.current = 1; // Set to 1 (Social tab index)

      // Ensure the scroll view is at the Social tab position
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: width, animated: false });
      }, 100);
    }
  }, [visible]);

  // Effect to update active tab based on scroll position
  useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      // Skip updating the active tab if we're currently responding to a tab click
      if (isTabClickRef.current) return;

      // Calculate which page we're on based on scroll position
      const pageIndex = Math.round(value / width);

      if (pageIndex === 0) {
        handleTabChange("Leaderboard");
        currentPageRef.current = 0;
        if (posthog) {
          posthog.screen("Leaderboard", {
            screen: "Social",
            tab: "Leaderboard"
          });
        }
      } else if (pageIndex === 1) {
        handleTabChange("Social");
        currentPageRef.current = 1;
        if (posthog) {
          posthog.screen("Social", {
            screen: "Social",
            tab: "Social"
          });
        }
      } else if (pageIndex === 2) {
        handleTabChange("Marketplace");
        currentPageRef.current = 2;
        if (posthog) {
          posthog.screen("Marketplace", {
            screen: "Social",
            tab: "Marketplace"
          });
        }
      }
    });

    return () => {
      scrollX.removeListener(listener);
    };
  }, []);

  const handleTabPress = (tab: string) => {
    // Track tab changes with PostHog
    if (posthog && tab !== activeTab) {
      posthog.capture("tab_changed", {
        screen: "Social",
        tab: tab
      });
    }
    
    // Set the flag to indicate we're responding to a tab click
    isTabClickRef.current = true;

    let pageIndex = 0;

    if (tab === "Leaderboard") {
      pageIndex = 0;
    } else if (tab === "Social") {
      pageIndex = 1;
    } else if (tab === "Marketplace") {
      pageIndex = 2;
    }

    // Don't update the activeTab immediately
    currentPageRef.current = pageIndex;
    scrollViewRef.current?.scrollTo({
      x: pageIndex * width,
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
        <StatusBar barStyle="dark-content" />

        {/* Header Tabs */}
        <View className="flex-row justify-center pt-4 pb-2">
          <View className="items-center mr-6">
            <TouchableOpacity
              onPress={() => handleTabPress("Leaderboard")}
              className="flex-row items-center"
            >
              <Text
                className={`text-lg font-lexend-bold ${activeTab === "Leaderboard" ? "text-primary" : "text-gray-400"}`}
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
                className={`text-lg font-lexend-bold ${activeTab === "Social" ? "text-primary" : "text-gray-400"}`}
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
                className={`text-lg font-lexend-bold ${activeTab === "Marketplace" ? "text-primary" : "text-gray-400"}`}
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