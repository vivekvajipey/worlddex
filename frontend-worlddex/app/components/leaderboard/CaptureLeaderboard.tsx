import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { supabase, Tables } from "../../../database/supabase-client";
import { useAuth } from "../../../src/contexts/AuthContext";
import { fetchCaptureCount } from "../../../database/hooks/useCaptureCount";
import { fetchUser } from "../../../database/hooks/useUsers";

type UserWithCaptures = {
  id: string;
  username: string;
  profile_picture_key?: string;
  capture_count: number;
  position: number;
};

type CaptureCount = {
  user_id: string;
  count: number;
};

const CaptureLeaderboard = () => {
  const { session } = useAuth();
  const currentUserId = session?.user?.id;

  const [topUsers, setTopUsers] = useState<UserWithCaptures[]>([]);
  const [currentUserData, setCurrentUserData] = useState<UserWithCaptures | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch top users and current user position
  const fetchLeaderboardData = async () => {
    try {
      let captureCountsData: CaptureCount[] = [];

      // Correct way to get counts grouped by user_id in Supabase
      const { data: counts, error: countError } = await supabase
        .rpc('get_user_capture_counts');

      if (countError) {
        console.error("Error counting captures:", countError);
        throw countError;
      }

      if (counts && counts.length > 0) {
        // Format the data as needed for processing
        captureCountsData = counts.map((item: { user_id: string; count: string }) => ({
          user_id: item.user_id,
          count: parseInt(item.count)
        }));

        // Sort by count descending
        captureCountsData.sort((a, b) => b.count - a.count);
      } else {
        // Fallback to manual counting if the query doesn't work
        const { data: allCaptures } = await supabase
          .from(Tables.CAPTURES)
          .select('user_id')
          .is('deleted_at', null);  // Exclude soft deleted captures

        if (allCaptures && allCaptures.length > 0) {
          // Count captures per user manually
          const userCaptureMap = new Map<string, number>();
          allCaptures.forEach((capture) => {
            const userId = capture.user_id;
            userCaptureMap.set(userId, (userCaptureMap.get(userId) || 0) + 1);
          });

          // Convert to array format
          userCaptureMap.forEach((count, userId) => {
            captureCountsData.push({ user_id: userId, count });
          });

          // Sort by count descending
          captureCountsData.sort((a, b) => b.count - a.count);
        }
      }

      if (captureCountsData.length === 0) {
        setTopUsers([]);
        setCurrentUserData(null);
        return;
      }

      // Process the data we got
      await processCaptureData(captureCountsData);

    } catch (err) {
      console.error("Leaderboard error:", err);
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Process the capture count data to get user details
  const processCaptureData = async (captureCountsData: CaptureCount[]) => {
    try {
      // Sort by count (highest first) if not already sorted
      const sortedData = [...captureCountsData].sort((a, b) => b.count - a.count);

      // Create a map of user positions
      const userPositions = new Map<string, number>();
      sortedData.forEach((item, index) => {
        userPositions.set(item.user_id, index + 1);
      });

      // Get top 3 users
      const topUserIds = sortedData.slice(0, 3).map(item => item.user_id);
      const topUsersData: UserWithCaptures[] = [];

      // Fetch user details for each top user
      for (const userId of topUserIds) {
        const userData = await fetchUser(userId);
        if (userData) {
          const captureCount = sortedData.find(c => c.user_id === userId)?.count || 0;
          topUsersData.push({
            id: userData.id,
            username: userData.username,
            profile_picture_key: userData.profile_picture_key,
            capture_count: captureCount,
            position: userPositions.get(userId) || 0
          });
        }
      }

      setTopUsers(topUsersData);

      // Get current user's position if they're not in top 3
      if (currentUserId && !topUserIds.includes(currentUserId)) {
        const userData = await fetchUser(currentUserId);

        // Find current user's capture count from the data
        let captureCount = sortedData.find(c => c.user_id === currentUserId)?.count || 0;

        // If not found in the data, fetch it directly
        if (captureCount === 0) {
          captureCount = await fetchCaptureCount(currentUserId);
        }

        // If user has 0 captures, put them at last place
        let position = userPositions.get(currentUserId) || 0;
        if (captureCount === 0) {
          position = sortedData.length + 1; // Last place
        }

        if (userData) {
          setCurrentUserData({
            id: userData.id,
            username: userData.username,
            profile_picture_key: userData.profile_picture_key,
            capture_count: captureCount,
            position: position
          });
        }
      }
    } catch (err) {
      console.error("Error processing capture data:", err);
      throw err; // Re-throw to be caught by the parent function
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, [currentUserId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboardData();
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-red-500">{error}</Text>
        <Text
          className="text-primary mt-4 font-lexend-medium"
          onPress={onRefresh}
        >
          Tap to retry
        </Text>
      </View>
    );
  }

  const renderLeaderboardItem = (item: UserWithCaptures) => {
    const isCurrentUser = item.id === currentUserId;

    // Determine color based on position
    let positionColor = "#000"; // Default color
    if (item.position === 1) {
      positionColor = "#FFD700"; // Gold
    } else if (item.position === 2) {
      positionColor = "#C0C0C0"; // Silver
    } else if (item.position === 3) {
      positionColor = "#CD7F32"; // Bronze
    }

    return (
      <View
        key={item.id}
        className={`flex-row items-center justify-between p-4 rounded-lg ${isCurrentUser ? "bg-primary/10" : "bg-card"}`}
      >
        <View className="flex-row items-center">
          <Text
            style={{ color: positionColor, fontWeight: 'bold' }}
            className="text-xl mr-3"
          >
            {item.position}
          </Text>
          <Text
            className={`text-lg ${isCurrentUser ? "font-lexend-bold" : "font-lexend-medium"}`}
          >
            {item.username}
          </Text>
          {isCurrentUser && (
            <Text className="text-xs ml-2 text-primary">(You)</Text>
          )}
        </View>
        <Text className="font-lexend-medium">
          {item.capture_count} captures
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 px-4 py-2">
      <View>
        <Text className="text-xl font-lexend-bold mb-4 text-center">Top Collectors</Text>

        {/* Top 3 Users - Manually mapped instead of using FlatList */}
        {topUsers.map((user) => renderLeaderboardItem(user))}

        {/* Show vertical ellipses if user is not in top 3 */}
        {currentUserData && !topUsers.some(user => user.id === currentUserId) && (
          <>
            <View className="flex items-center my-1">
              <Text className="text-gray-400 text-xl leading-[6px]">.</Text>
              <Text className="text-gray-400 text-xl leading-[6px]">.</Text>
              <Text className="text-gray-400 text-xl leading-[6px]">.</Text>
            </View>

            {renderLeaderboardItem(currentUserData)}
          </>
        )}

        {topUsers.length === 0 && (
          <View className="py-8 items-center">
            <Text className="text-gray-400">No data available</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default CaptureLeaderboard;