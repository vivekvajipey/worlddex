import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface LocationPromptProps {
  visible: boolean;
  itemName: string;
  onEnableLocation: () => void;
  onSkip: () => void;
}

export const LocationPrompt: React.FC<LocationPromptProps> = ({
  visible,
  itemName,
  onEnableLocation,
  onSkip
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
      <BlurView intensity={80} tint="dark" style={{ flex: 1 }}>
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            {/* Success Icon */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-3">
                <Ionicons name="checkmark-circle" size={40} color="#10B981" />
              </View>
              <Text className="text-xl font-lexend-semibold text-gray-900">
                Nice! You captured{'\n'}{itemName}
              </Text>
            </View>

            {/* Location Value Prop */}
            <View className="items-center mb-6">
              <Ionicons name="location" size={32} color="#6B7280" />
              <Text className="text-base font-lexend-regular text-gray-600 text-center mt-2">
                Want to remember where you found it?
              </Text>
              <Text className="text-sm font-lexend-regular text-gray-500 text-center mt-1">
                Add location to build a map of your discoveries
              </Text>
            </View>

            {/* Buttons */}
            <TouchableOpacity
              onPress={onEnableLocation}
              className="bg-primary rounded-full py-4 mb-3"
              activeOpacity={0.8}
            >
              <Text className="text-white font-lexend-semibold text-center text-base">
                Enable Location
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSkip}
              className="py-4"
              activeOpacity={0.8}
            >
              <Text className="text-gray-500 font-lexend-medium text-center text-base">
                Skip for Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};