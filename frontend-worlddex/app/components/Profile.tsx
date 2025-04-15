import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Image, ActivityIndicator } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function Profile() {
  const { session, signOut } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      setModalVisible(false);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const userInitial = session?.user?.email?.[0]?.toUpperCase() || "?";
  const userEmail = session?.user?.email || "User";
  const userAvatar = session?.user?.user_metadata?.avatar_url;

  return (
    <>
      <TouchableOpacity
        className="absolute bottom-8 right-8 w-16 h-16 rounded-full bg-primary flex justify-center items-center shadow-md"
        onPress={() => setModalVisible(true)}
      >
        {userAvatar ? (
          <Image
            source={{ uri: userAvatar }}
            className="w-14 h-14 rounded-full"
          />
        ) : (
          <Text className="text-white font-lexend-bold text-2xl">{userInitial}</Text>
        )}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end">
          <TouchableOpacity
            className="absolute inset-0 bg-black/40"
            onPress={() => setModalVisible(false)}
          />
          <View className="bg-surface rounded-t-3xl p-6 pb-10">
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />

            <View className="flex-row items-center mb-8">
              {userAvatar ? (
                <Image
                  source={{ uri: userAvatar }}
                  className="w-16 h-16 rounded-full mr-4"
                />
              ) : (
                <View className="w-16 h-16 rounded-full bg-primary flex justify-center items-center mr-4">
                  <Text className="text-white font-lexend-bold text-2xl">{userInitial}</Text>
                </View>
              )}
              <View>
                <Text className="text-text-primary font-lexend-bold text-xl">{userEmail}</Text>
                <Text className="text-text-secondary font-lexend-medium">
                  Signed in with {session?.user?.app_metadata?.provider
                    ? session.user.app_metadata.provider.charAt(0).toUpperCase() + session.user.app_metadata.provider.slice(1)
                    : "Email"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="flex-row items-center py-4 border-t border-gray-100"
              onPress={() => { }}
            >
              <Ionicons name="settings-outline" size={24} color="#6B7280" style={{ marginRight: 12 }} />
              <Text className="text-text-primary font-lexend-medium">Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center py-4 border-t border-gray-100"
              onPress={() => { }}
            >
              <Ionicons name="help-circle-outline" size={24} color="#6B7280" style={{ marginRight: 12 }} />
              <Text className="text-text-primary font-lexend-medium">Help & Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center py-4 border-t border-gray-100"
              onPress={handleSignOut}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#F97316" style={{ marginRight: 12 }} />
              ) : (
                <Ionicons name="log-out-outline" size={24} color="#EF4444" style={{ marginRight: 12 }} />
              )}
              <Text className="text-error font-lexend-medium">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
} 