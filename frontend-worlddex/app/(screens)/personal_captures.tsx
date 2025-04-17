import React from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserCaptures } from "../../database/hooks/useCaptures";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import CaptureCard from "../components/CaptureCard";

export default function PersonalCapturesScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const { captures, loading, error } = useUserCaptures(userId);
  const router = useRouter();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text className="text-error">{error.message}</Text>
      </View>
    );
  }

  if (!captures.length) {
    return (
      <View className="flex-1 justify-center items-center bg-background p-4">
        <Text className="text-text-primary">No captures yet.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="mx-4 mt-4 bg-primary rounded-3xl py-4 items-center shadow-md">
        <Text className="text-white font-lexend-bold text-2xl">My Captures</Text>
      </View>
      {/* Captures Grid */}
      <FlatList
        data={captures}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CaptureCard capture={item} />}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 16 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
      {/* Back Button */}
      <TouchableOpacity className="absolute bottom-6 left-6 w-14 h-14 rounded-full bg-orange-500 flex justify-center items-center shadow-lg" onPress={() => router.back()}>
        <Ionicons name="camera-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
