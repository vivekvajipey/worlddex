import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Switch } from "react-native";
import { Image } from "expo-image";
import { useAuth } from "../../../src/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../../../database/hooks/useUsers";
import { isUsernameAvailable, fetchUser } from "../../../database/hooks/useUsers";
import { useCaptureCount } from "../../../database/hooks/useCaptureCount";
import * as ImagePicker from "expo-image-picker";
import { deleteAllUserData } from "../../../database/supabase";
import Colors from "../../../src/utils/colors";
import { usePhotoUpload } from "../../../src/hooks/usePhotoUpload";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import retroCoin from "../../../assets/images/retro_coin.png";
import { usePostHog } from "posthog-react-native";
import { calculateLevelProgress, getXPRequiredForLevel, formatXP } from "../../../database/hooks/useXP";
import { useAlert } from "../../../src/contexts/AlertContext";

interface ProfileProps {
  onOpenFeedback: () => void;
}

export default function Profile({ onOpenFeedback }: ProfileProps) {
  const { session, signOut } = useAuth();
  const userId = session?.user?.id || null;
  const { user, loading, error, updateUser } = useUser(userId);
  const { totalCaptures, refreshCaptureCount } = useCaptureCount(userId);
  const { uploadPhoto, isUploading } = usePhotoUpload();
  const posthog = usePostHog();
  const { showAlert } = useAlert();

  // Add mounted state to prevent tracking on rerenders
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    // Track screen view only once when component first mounts
    if (posthog && isMounted && !profileTrackingDone.current) {
      posthog.screen("Profile");
      profileTrackingDone.current = true;
    }
  }, [posthog, isMounted]);

  // Reference to track if we've already logged this view
  const profileTrackingDone = useRef(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [refreshedUser, setRefreshedUser] = useState(user);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [defaultPublicCaptures, setDefaultPublicCaptures] = useState(false);

  // Download profile picture URL if available
  const { downloadUrl, loading: loadingProfilePic } = useDownloadUrl(
    refreshedUser?.profile_picture_key || ""
  );

  // Load user data
  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setOriginalUsername(user.username || "");
      setRefreshedUser(user);
      // Set default privacy setting from user preferences
      setDefaultPublicCaptures(user.default_public_captures || false);
    }
  }, [user]);

  // Force refresh user data when modal becomes visible
  useEffect(() => {
    if (modalVisible && userId) {
      refreshUserData();
      refreshCaptureCount();
    }
  }, [modalVisible, userId, refreshCaptureCount]);

  const refreshUserData = useCallback(async () => {
    if (!userId) return;

    setIsRefreshing(true);
    try {
      const freshUserData = await fetchUser(userId);
      if (freshUserData) {
        setRefreshedUser(freshUserData);
        // Also update username if needed
        if (freshUserData.username && !isEditing) {
          setUsername(freshUserData.username);
          setOriginalUsername(freshUserData.username);
        }
        // Set default privacy setting from user preferences
        setDefaultPublicCaptures(freshUserData.default_public_captures || false);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, isEditing]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setModalVisible(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const checkUsername = async (newUsername: string) => {
    if (!userId) return false;

    // Clear previous errors
    setUsernameError("");

    // If username hasn't changed, no need to check
    if (newUsername === originalUsername) return true;

    // Basic validation
    if (!newUsername || newUsername.trim().length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }

    // No special characters except underscore
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setUsernameError("Username can only contain letters, numbers, and underscores");
      return false;
    }

    setIsCheckingUsername(true);

    try {
      const isAvailable = await isUsernameAvailable(newUsername, userId);

      if (!isAvailable) {
        setUsernameError("Username is already taken");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameError("Error checking username availability");
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const saveUserData = async () => {
    if (!refreshedUser || !userId) return;

    try {
      // Validate username before saving
      const isValid = await checkUsername(username);

      if (!isValid) return;

      await updateUser({
        username,
        default_public_captures: defaultPublicCaptures
      });
      setIsEditing(false);
      setOriginalUsername(username);
      // Refresh user data after update
      await refreshUserData();
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    setUsernameError(""); // Clear error when typing
  };

  const pickImage = async () => {
    if (!userId) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        const fileName = uri.split('/').pop() || 'profile.jpg';
        const contentType = 'image/jpeg';

        // Upload to S3
        const key = await uploadPhoto(
          uri,
          contentType,
          fileName,
          `profiles/${userId}`
        );

        // Update user record with new key
        await updateUser({ profile_picture_key: key });

        // Refresh user data
        await refreshUserData();
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleDeleteAccount = () => {
    showAlert({
      title: "Delete Account",
      message: "Your account will be deactivated and hidden from the app. You'll have 30 days to restore it by signing in again. After 30 days, your account and all data will be permanently deleted.",
      icon: "trash-outline",
      iconColor: "#EF4444",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!userId) return;

            try {
              // Soft delete user data
              await deleteAllUserData(userId);

              // Sign out user
              await signOut();
              setModalVisible(false);
            } catch (error) {
              console.error("Error deleting account:", error);
              showAlert({
                title: "Error",
                message: "Failed to delete account. Please try again.",
                icon: "alert-circle-outline",
                iconColor: "#EF4444"
              });
            }
          }
        }
      ]
    });
  };

  // Toggle default public/private setting
  const toggleDefaultPublicCaptures = async (value: boolean) => {
    try {
      // Update state immediately for a smooth UI experience
      setDefaultPublicCaptures(value);

      // Update the user data in the database but don't refresh the entire component
      await updateUser({ default_public_captures: value });

      // Update the refreshedUser state locally without triggering a full refresh
      if (refreshedUser) {
        setRefreshedUser({
          ...refreshedUser,
          default_public_captures: value
        });
      }
    } catch (error) {
      // Revert the switch if there was an error
      setDefaultPublicCaptures(!value);
      console.error("Error updating privacy setting:", error);
    }
  };


  const userInitial = refreshedUser?.username?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || "?";
  
  // Handle Apple's Hide My Email feature
  const rawEmail = session?.user?.email || "User";
  const isApplePrivateRelay = rawEmail.includes('@privaterelay.appleid.com');
  const userEmail = isApplePrivateRelay ? 'Private Email' : rawEmail;
  const dailyCapturesRemaining = refreshedUser ? 
    (refreshedUser.is_admin ? "∞" : Math.max(0, 10 - (refreshedUser.daily_captures_used || 0))) : 0;

  // Use S3 profile pic or fall back to OAuth provider pic
  const oauthProfilePic = session?.user?.user_metadata?.avatar_url;
  const displayProfilePic = downloadUrl || oauthProfilePic;

  // Track whether we've tried loading the S3 profile picture yet
  const isInitialLoading = refreshedUser?.profile_picture_key && !downloadUrl && !loadingProfilePic;

  return (
    <>
      <View className="absolute bottom-8 right-8 items-center">
        <View className="bg-black/50 px-3 py-1 rounded-full mb-1">
          <Text className="text-sm text-white font-lexend-medium">Profile</Text>
        </View>
        <TouchableOpacity
          className="w-20 h-20 rounded-full flex justify-center items-center shadow-lg overflow-hidden"
          onPress={handleOpenModal}
        >
          {loadingProfilePic || isInitialLoading ? (
            <View className="w-20 h-20 rounded-full bg-primary flex justify-center items-center">
              <ActivityIndicator color={Colors.background.surface} />
            </View>
          ) : displayProfilePic ? (
            <Image
              source={{ uri: displayProfilePic }}
              style={{ width: 80, height: 80 }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View className="w-20 h-20 rounded-full bg-primary flex justify-center items-center">
              <Text className="text-surface font-lexend-bold text-3xl">{userInitial}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity
              className="absolute inset-0 bg-black/40"
              onPress={() => setModalVisible(false)}
            />
            <View className="bg-background rounded-t-3xl p-6 pb-10">
              <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />

              {loading || isRefreshing ? (
                <View className="py-8" />
              ) : (
                <>
                  <View className="flex-row items-center mb-8">
                    {/* Balance display */}
                    <View className="absolute top-1/2 right-0 -translate-y-1/2 flex-row items-center">
                      <View className="flex-row items-center justify-center bg-accent-200 border border-primary rounded-full px-3 py-1" style={{ minWidth: 54 }}>
                        <Image
                          source={retroCoin}
                          style={{ width: 22, height: 22, marginRight: 4 }}
                          contentFit="contain"
                        />
                        <Text className="text-primary font-lexend-bold text-lg">{refreshedUser?.balance ?? 0}</Text>
                      </View>
                    </View>

                    <TouchableOpacity onPress={pickImage} className="relative mr-4">
                      {loadingProfilePic || isUploading || isInitialLoading ? (
                        <View className="w-20 h-20 rounded-full bg-gray-200 flex justify-center items-center">
                          <ActivityIndicator color={Colors.primary.DEFAULT} />
                        </View>
                      ) : displayProfilePic ? (
                        <Image
                          source={{ uri: displayProfilePic }}
                          style={{ width: 80, height: 80, borderRadius: 40 }}
                          contentFit="cover"
                          transition={200}
                        />
                      ) : (
                        <View className="w-20 h-20 rounded-full bg-primary flex justify-center items-center">
                          <Text className="text-surface font-lexend-bold text-3xl">{userInitial}</Text>
                        </View>
                      )}
                      <View className="absolute bottom-0 right-0 bg-primary rounded-full p-1">
                        <Ionicons name="camera" size={16} color={Colors.background.surface} />
                      </View>
                    </TouchableOpacity>

                    <View className="flex-1">
                      {isEditing ? (
                        <View>
                          <TextInput
                            value={username}
                            onChangeText={handleUsernameChange}
                            className={`text-text-primary font-lexend-bold text-xl border-b ${usernameError ? 'border-error' : 'border-primary'} pb-1 mb-1`}
                            placeholder="Enter username"
                            autoFocus
                          />
                          {usernameError ? (
                            <Text className="text-error text-xs">{usernameError}</Text>
                          ) : null}
                        </View>
                      ) : (
                        <View className="flex-row items-center">
                          <Text className="text-text-primary font-lexend-bold text-xl mr-2">
                            {refreshedUser?.username || "Set Username"}
                          </Text>
                          {refreshedUser?.is_admin && (
                            <View className="bg-primary/20 px-2 py-0.5 rounded-full mr-2">
                              <Text className="text-primary text-xs font-lexend-bold">ADMIN</Text>
                            </View>
                          )}
                          <TouchableOpacity onPress={() => setIsEditing(true)}>
                            <Ionicons name="pencil" size={16} color={Colors.text.secondary} />
                          </TouchableOpacity>
                        </View>
                      )}
                      <Text
                        className="text-text-secondary font-lexend-medium"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{ maxWidth: 180 }}
                      >
                        {userEmail}
                      </Text>
                    </View>

                    {isEditing && (
                      <TouchableOpacity
                        onPress={saveUserData}
                        className={`ml-2 p-2 rounded-full ${isCheckingUsername ? 'bg-gray-300' : 'bg-primary'}`}
                        disabled={isCheckingUsername || !!usernameError}
                      >
                        <Ionicons name="checkmark" size={20} color={Colors.background.surface} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Level and XP Progress */}
                  <View className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <Text className="text-text-primary font-lexend-bold text-lg">Level {refreshedUser?.level || 1}</Text>
                        <Text className="text-text-secondary font-lexend-medium text-sm ml-2">
                          {formatXP(refreshedUser?.xp || 0)} XP
                        </Text>
                      </View>
                      <Text className="text-text-secondary font-lexend-medium text-sm">
                        {formatXP(getXPRequiredForLevel((refreshedUser?.level || 1) + 1) - (refreshedUser?.xp || 0))} to next
                      </Text>
                    </View>
                    <View className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <View 
                        className="bg-primary h-full rounded-full"
                        style={{ 
                          width: `${calculateLevelProgress(refreshedUser?.xp || 0, refreshedUser?.level || 1)}%` 
                        }}
                      />
                    </View>
                  </View>

                  <View className="flex-row justify-between mb-6 px-2">
                    <View className="items-center">
                      <Text className="text-primary font-lexend-bold text-xl">{dailyCapturesRemaining}</Text>
                      <Text className="text-text-secondary font-lexend-medium text-xs">Daily Captures Left</Text>
                    </View>

                    <View className="items-center">
                      <View className="flex-row items-center">
                        <Text className="text-primary font-lexend-bold text-xl mr-1">{refreshedUser?.capture_streak || 0}</Text>
                        <Text className="text-xl">🔥</Text>
                      </View>
                      <Text className="text-text-secondary font-lexend-medium text-xs">Day Streak</Text>
                    </View>

                    <View className="items-center">
                      <Text className="text-primary font-lexend-bold text-xl">{totalCaptures}</Text>
                      <Text className="text-text-secondary font-lexend-medium text-xs">Total Captures</Text>
                    </View>
                  </View>

                  {/* Default capture visibility preference */}
                  <View className="flex-row items-center justify-between py-4 border-t border-gray-100">
                    <View className="flex-row items-center">
                      {defaultPublicCaptures ? (
                        <Ionicons name="globe-outline" size={24} color={Colors.text.secondary} style={{ marginRight: 12 }} />
                      ) : (
                        <Ionicons name="lock-closed-outline" size={24} color={Colors.text.secondary} style={{ marginRight: 12 }} />
                      )}
                      <View>
                        <Text className="text-text-primary font-lexend-medium">Default Capture Visibility</Text>
                        <Text className="text-text-secondary text-xs font-lexend-regular">
                          {defaultPublicCaptures ? "Public - Visible to everyone" : "Private - Only visible to you"}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                      thumbColor={defaultPublicCaptures ? Colors.primary.DEFAULT : "#f4f3f4"}
                      onValueChange={toggleDefaultPublicCaptures}
                      value={defaultPublicCaptures}
                    />
                  </View>


                  <TouchableOpacity
                    className="flex-row items-center py-4 border-t border-gray-100"
                    onPress={() => {
                      setModalVisible(false);
                      onOpenFeedback();
                    }}
                  >
                    <Ionicons name="help-circle-outline" size={24} color={Colors.text.secondary} style={{ marginRight: 12 }} />
                    <Text className="text-text-primary font-lexend-medium">Help & Support</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center py-4 border-t border-gray-100"
                    onPress={handleDeleteAccount}
                  >
                    <Ionicons name="trash-outline" size={24} color={Colors.error.DEFAULT} style={{ marginRight: 12 }} />
                    <Text className="text-error font-lexend-medium">Delete Account</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center py-4 border-t border-gray-100"
                    onPress={handleSignOut}
                  >
                    <Ionicons name="log-out-outline" size={24} color={Colors.error.DEFAULT} style={{ marginRight: 12 }} />
                    <Text className="text-error font-lexend-medium">Sign Out</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
        
      </Modal>
    </>
  );
}