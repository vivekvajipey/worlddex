import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Switch } from "react-native";
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

interface ProfileProps {
  onOpenFeedback: () => void;
}

export default function Profile({ onOpenFeedback }: ProfileProps) {
  const { session, signOut } = useAuth();
  const userId = session?.user?.id || null;
  const { user, loading, error, updateUser } = useUser(userId);
  const { totalCaptures, refreshCaptureCount } = useCaptureCount(userId);
  const { uploadPhoto, isUploading } = usePhotoUpload();

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
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your data, including your captures, will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!userId) return;

            try {
              // Delete all user data using the utility function
              await deleteAllUserData(userId);

              // Sign out user
              await signOut();
              setModalVisible(false);
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert("Error", "Failed to delete account. Please try again.");
            }
          }
        }
      ]
    );
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
  const userEmail = session?.user?.email || "User";
  const dailyCapturesRemaining = refreshedUser ? Math.max(0, 10 - (refreshedUser.daily_captures_used || 0)) : 0;

  // Use S3 profile pic or fall back to OAuth provider pic
  const oauthProfilePic = session?.user?.user_metadata?.avatar_url;
  const displayProfilePic = downloadUrl || oauthProfilePic;

  // Track whether we've tried loading the S3 profile picture yet
  const isInitialLoading = refreshedUser?.profile_picture_key && !downloadUrl && !loadingProfilePic;

  return (
    <>
      <TouchableOpacity
        className="absolute bottom-8 right-8 w-16 h-16 rounded-full flex justify-center items-center"
        onPress={handleOpenModal}
      >
        {loadingProfilePic || isInitialLoading ? (
          <View className="w-16 h-16 rounded-full bg-primary flex justify-center items-center">
            <ActivityIndicator color={Colors.background.surface} />
          </View>
        ) : displayProfilePic ? (
          <Image
            source={{ uri: displayProfilePic }}
            style={{ width: 64, height: 64, borderRadius: 32 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View className="w-16 h-16 rounded-full bg-primary flex justify-center items-center">
            <Text className="text-surface font-lexend-bold text-2xl">{userInitial}</Text>
          </View>
        )}
      </TouchableOpacity>

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
                    <TouchableOpacity className="absolute top-0 right-0" onPress={handleDeleteAccount}>
                      <Ionicons name="trash-outline" size={24} color={Colors.error.DEFAULT} />
                    </TouchableOpacity>

                    {/* Balance display below trash can icon */}
                    <View className="absolute top-8 right-0 flex-row items-center">
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