import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { supabase, Tables } from "../../../database/supabase-client";
import { useAuth } from "../../../src/contexts/AuthContext";
import OfflineIndicator from "../OfflineIndicator";

type UserWithCaptures = {
  id: string;
  username: string;
  profile_picture_key?: string;
  capture_count: number;
  position: number;
};

interface CaptureLeaderboardProps {
  refreshing?: boolean;
  onRefreshComplete?: () => void;
  onError?: (hasError: boolean) => void;
}

const CaptureLeaderboard: React.FC<CaptureLeaderboardProps> = ({ 
  refreshing = false, 
  onRefreshComplete, 
  onError 
}) => {
  const { session } = useAuth();
  const currentUserId = session?.user?.id;

  const [topUsers, setTopUsers] = useState<UserWithCaptures[]>([]);
  const [currentUserData, setCurrentUserData] = useState<UserWithCaptures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch top users and current user position
  const fetchLeaderboardData = async () => {
    try {
      setError(null); // Clear any previous errors

      // Get users ordered by total_captures
      const { data: users, error: userError } = await supabase
        .from(Tables.USERS)
        .select('id, username, profile_picture_key, total_captures')
        .order('total_captures', { ascending: false })
        .limit(50); // Get top 50 for position calculation

      if (userError) {
        throw new Error(`Database Error: ${userError.message || userError}`);
      }

      if (!users || users.length === 0) {
        setTopUsers([]);
        setCurrentUserData(null);
        return;
      }

      // Get top 3 users
      const topUsersData: UserWithCaptures[] = users.slice(0, 3).map((user, index) => ({
        id: user.id,
        username: user.username,
        profile_picture_key: user.profile_picture_key,
        capture_count: user.total_captures || 0,
        position: index + 1
      }));

      setTopUsers(topUsersData);

      // Get current user's position if they're not in top 3
      if (currentUserId && !topUsersData.some(u => u.id === currentUserId)) {
        const currentUserIndex = users.findIndex(u => u.id === currentUserId);
        
        if (currentUserIndex !== -1) {
          // User is in top 50
          const userData = users[currentUserIndex];
          setCurrentUserData({
            id: userData.id,
            username: userData.username,
            profile_picture_key: userData.profile_picture_key,
            capture_count: userData.total_captures || 0,
            position: currentUserIndex + 1
          });
        } else {
          // User is not in top 50, fetch their data separately
          const { data: userData, error: userDataError } = await supabase
            .from(Tables.USERS)
            .select('id, username, profile_picture_key, total_captures')
            .eq('id', currentUserId)
            .single();

          if (userData && !userDataError) {
            // Get exact position by counting users with more captures
            const { count, error: countError } = await supabase
              .from(Tables.USERS)
              .select('id', { count: 'exact', head: true })
              .gt('total_captures', userData.total_captures || 0);

            const position = countError ? users.length + 1 : (count || 0) + 1;

            setCurrentUserData({
              id: userData.id,
              username: userData.username,
              profile_picture_key: userData.profile_picture_key,
              capture_count: userData.total_captures || 0,
              position: position
            });
          }
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 
                          typeof err === 'string' ? err : 
                          "Failed to load leaderboard";
      
      setError(errorMessage);
      onError?.(true);
    } finally {
      setLoading(false);
      onRefreshComplete?.();
    }
  };

  // Removed processCaptureData - no longer needed with direct query

  useEffect(() => {
    fetchLeaderboardData();
  }, [currentUserId]);

  // Handle refresh when refreshing prop becomes true
  useEffect(() => {
    if (refreshing) {
      fetchLeaderboardData();
    }
  }, [refreshing]);

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // Don't render if there's an error - let parent handle it
  if (error) {
    return null;
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