import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface DeleteConfirmationModalProps {
  visible: boolean;
  itemName: string;
  imageUrl?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({
  visible,
  itemName,
  imageUrl,
  onConfirm,
  onCancel
}: DeleteConfirmationModalProps) {
  const [scaleValue] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      }).start();
    } else {
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 justify-center items-center bg-black/60">
        <Animated.View 
          className="bg-background rounded-2xl p-6 mx-8 max-w-sm w-full shadow-xl"
          style={{
            transform: [{ scale: scaleValue }]
          }}
        >
          {/* Icon and Image Row */}
          <View className="items-center mb-4">
            <View className="bg-red-100 rounded-full p-3 mb-3">
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>
            
            {/* Capture Image */}
            {imageUrl && (
              <View className="w-24 h-24 rounded-lg overflow-hidden bg-gray-200 mb-3">
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={300}
                />
              </View>
            )}
          </View>

          {/* Title */}
          <Text className="text-text-primary font-lexend-bold text-xl text-center mb-2">
            Delete Capture
          </Text>

          {/* Item Name */}
          <Text className="text-text-primary font-lexend-semibold text-lg text-center mb-2">
            "{itemName}"
          </Text>

          {/* Message */}
          <Text className="text-text-secondary font-lexend-regular text-base text-center mb-6">
            This action cannot be undone.
          </Text>

          {/* Buttons */}
          <View className="flex-row justify-between">
            <TouchableOpacity
              onPress={onCancel}
              className="bg-gray-500 rounded-full px-6 py-3 flex-1"
              activeOpacity={0.8}
            >
              <Text className="text-white font-lexend-semibold text-center text-base">
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onConfirm}
              className="bg-red-500 rounded-full px-6 py-3 flex-1 ml-2"
              activeOpacity={0.8}
            >
              <Text className="text-white font-lexend-semibold text-center text-base">
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}