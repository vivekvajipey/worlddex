import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  SafeAreaView,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useModalQueue } from "../../src/contexts/ModalQueueContext";
import CaptureLeaderboard from "../components/leaderboard/CaptureLeaderboard";
import CollectionLeaderboards from "../components/leaderboard/CollectionLeaderboards";
import { useTopCaptures } from "../../database/hooks/useCaptures";
import CapturePost from "../components/social/CapturePost";
import { useDownloadUrls } from "../../src/hooks/useDownloadUrls";
import MarketplaceFeed from "../components/marketplace/MarketplaceFeed";
import CreateListingScreen from "../components/marketplace/CreateListingScreen";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUser } from "../../database/hooks/useUsers";
import { Image } from "expo-image";
import retroCoin from "../../assets/images/retro_coin.png";
import { supabase } from "../../database/supabase-client";
import { usePostHog } from "posthog-react-native";
import OfflineIndicator from "../components/OfflineIndicator";

const { width: screenWidth } = Dimensions.get("window");

// Memoized Leaderboard Tab Component
const LeaderboardTab = React.memo(() => {
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setHasError(false);
  }, []);

  const handleRefreshComplete = useCallback(() => {
    setRefreshing(false);
  }, []);

  const handleLeaderboardError = useCallback((error: boolean) => {
    setHasError(error);
  }, []);

  const renderContent = useCallback(() => {
    if (hasError) {
      return <OfflineIndicator message="Leaderboard unavailable offline" showSubtext={false} />;
    }

    return (
      <>
        <CaptureLeaderboard 
          refreshing={refreshing}
          onRefreshComplete={handleRefreshComplete}
          onError={handleLeaderboardError} 
        />

        <View className="px-4 py-6">
          <View className="border-t border-gray-200" />
        </View>

        <View>
          <Text className="text-xl font-lexend-bold mb-4 text-center">Collection Leaderboards</Text>
          <CollectionLeaderboards 
            refreshing={refreshing}  
            onRefreshComplete={handleRefreshComplete}
            onError={handleLeaderboardError} 
          />
        </View>
      </>
    );
  }, [hasError, refreshing, handleRefreshComplete, handleLeaderboardError]);

  // Convert to FlatList for better performance
  return (
    <View className="flex-1 p-2">
      <FlatList
        data={[{ key: 'content' }]}
        renderItem={renderContent}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6366f1"]}
            tintColor="#6366f1"
          />
        }
      />
    </View>
  );
});

// Memoized Social Tab Component
const SocialTab = React.memo(() => {
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

  const imageKeys = useMemo(() => {
    return captures.map(capture => capture.image_key).filter(Boolean) as string[];
  }, [captures]);

  const { items: imageUrlItems, loading: imageUrlsLoading } = useDownloadUrls(imageKeys);

  const imageUrlMap = useMemo(() => {
    return Object.fromEntries(imageUrlItems.map(item => [item.key, item.downloadUrl]));
  }, [imageUrlItems]);

  const handleUserPress = useCallback((userId: string) => {
    console.log("Navigate to user profile:", userId);
  }, []);

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;

    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text className="text-gray-500 mt-2 font-lexend-regular">
          Loading more...
        </Text>
      </View>
    );
  }, [hasMore]);

  const renderEmpty = useCallback(() => {
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
  }, [loading]);

  if (error && captures.length === 0) {
    return <OfflineIndicator message="Social feed unavailable offline" showSubtext={false} />;
  }

  return (
    <View className="flex-1 bg-background">
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
        removeClippedSubviews={true}
        windowSize={10}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
      />

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
});

// Memoized Marketplace Tab Component
const MarketplaceTab = React.memo(() => {
  const { session } = useAuth();
  const { user } = useUser(session?.user?.id || null);
  const [localBalance, setLocalBalance] = useState(user?.balance ?? 0);
  
  useEffect(() => {
    setLocalBalance(user?.balance ?? 0);
  }, [user?.balance]);

  const refreshUserBalance = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("users")
      .select("balance")
      .eq("id", user.id)
      .single();
    if (!error && data) setLocalBalance(data.balance);
  }, [user?.id]);

  const [createListingVisible, setCreateListingVisible] = useState(false);
  const [marketplaceFeedKey, setMarketplaceFeedKey] = useState(0);
  const [marketplaceRefreshKey, setMarketplaceRefreshKey] = useState(0);

  const handleMarketplaceRefresh = useCallback(() => {
    setMarketplaceRefreshKey((k) => k + 1);
    refreshUserBalance();
  }, [refreshUserBalance]);

  const refreshMarketplaceFeed = useCallback(() => {
    setMarketplaceFeedKey((k) => k + 1);
  }, []);

  const handleUserPress = useCallback((userId: string) => {
    console.log("Navigate to user profile:", userId);
  }, []);

  return (
    <View className="flex-1 bg-background">
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

      <TouchableOpacity
        onPress={() => setCreateListingVisible(true)}
        className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-primary justify-center items-center shadow-lg"
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      <CreateListingScreen
        visible={createListingVisible}
        onClose={() => setCreateListingVisible(false)}
        onListingCreated={refreshMarketplaceFeed}
      />
    </View>
  );
});

export default function SocialScreen() {
  const posthog = usePostHog();
  const router = useRouter();
  const { isShowingModal, dismissCurrentModal } = useModalQueue();

  const [activeTab, setActiveTab] = useState("Social");
  const translateX = useRef(new Animated.Value(-screenWidth)).current;
  const currentIndex = useRef(1);

  const tabs = useMemo(() => ["Leaderboard", "Social", "Marketplace"], []);

  useEffect(() => {
    if (posthog) {
      posthog.screen("Social");
    }
  }, [posthog]);

  // Optimized pan responder with momentum
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dy) < 10;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(-currentIndex.current * screenWidth + gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const velocity = gestureState.vx;
        const threshold = screenWidth / 3;
        
        let nextIndex = currentIndex.current;
        
        // Use velocity for more responsive swiping
        if (Math.abs(velocity) > 0.3) {
          if (velocity > 0 && currentIndex.current > 0) {
            nextIndex = currentIndex.current - 1;
          } else if (velocity < 0 && currentIndex.current < tabs.length - 1) {
            nextIndex = currentIndex.current + 1;
          }
        } else {
          // Fall back to distance-based detection
          if (gestureState.dx > threshold && currentIndex.current > 0) {
            nextIndex = currentIndex.current - 1;
          } else if (gestureState.dx < -threshold && currentIndex.current < tabs.length - 1) {
            nextIndex = currentIndex.current + 1;
          }
        }
        
        animateToTab(nextIndex);
      },
    })
  ).current;

  const animateToTab = useCallback((index: number) => {
    currentIndex.current = index;
    setActiveTab(tabs[index]);
    
    Animated.spring(translateX, {
      toValue: -index * screenWidth,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();

    // Track tab changes
    if (posthog) {
      posthog.screen(tabs[index], {
        screen: "Social",
        tab: tabs[index]
      });
    }
  }, [translateX, tabs, posthog]);

  const handleTabPress = useCallback((tabName: string) => {
    const index = tabs.indexOf(tabName);
    if (index !== -1) {
      animateToTab(index);
    }
  }, [tabs, animateToTab]);

  // Reset to Social tab on mount
  useEffect(() => {
    animateToTab(1);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar barStyle="dark-content" />

      {/* Header with back button and tabs */}
      <View>
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-4 top-4 p-2 z-10"
        >
          <Ionicons name="chevron-back" size={28} color="#9CA3AF" />
        </TouchableOpacity>
        
        {/* Header Tabs - centered */}
        <View className="flex-row justify-center items-center pt-4 pb-2">
          <View className="flex-row">
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => handleTabPress(tab)}
                className="mx-4"
              >
                <View className="items-center">
                  <Text
                    className={`text-lg font-lexend-bold ${
                      activeTab === tab ? "text-primary" : "text-gray-400"
                    }`}
                  >
                    {tab}
                  </Text>
                  {activeTab === tab && (
                    <View className="h-[3px] w-full bg-primary mt-1 rounded-full" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Animated content container */}
      <View className="flex-1" {...panResponder.panHandlers}>
        <Animated.View
          style={{
            flexDirection: 'row',
            width: screenWidth * tabs.length,
            transform: [{ translateX }],
            flex: 1,
          }}
        >
          <View style={{ width: screenWidth }}>
            <LeaderboardTab />
          </View>
          <View style={{ width: screenWidth }}>
            <SocialTab />
          </View>
          <View style={{ width: screenWidth }}>
            <MarketplaceTab />
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}