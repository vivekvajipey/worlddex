import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';
import { backgroundColor } from '../../src/utils/colors';
import { Ionicons } from '@expo/vector-icons';

interface OnboardingCircleModalProps {
  visible: boolean;
  onClose: () => void;
}

export const OnboardingCircleModal: React.FC<OnboardingCircleModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-center items-center px-6">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
          {/* Header */}
          <View className="items-center mb-4">
            <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-3">
              <Ionicons name="sparkles" size={32} color={backgroundColor} />
            </View>
            <Text className="text-2xl font-lexend-bold text-gray-900">New Capture Method!</Text>
            <Text className="text-base font-lexend-regular text-gray-600 mt-2 text-center">
              You've unlocked precision capturing
            </Text>
          </View>

          {/* Gesture Illustration */}
          <View className="bg-gray-50 rounded-2xl p-6 mb-6">
            <View className="items-center mb-4">
              <View className="relative">
                <Svg width={120} height={120} viewBox="0 0 120 120">
                  {/* Example object (a cup) */}
                  <Path
                    d="M40 50 Q40 70 50 80 L70 80 Q80 70 80 50 L40 50"
                    fill="#E5E7EB"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                  />
                  <Path
                    d="M80 60 Q90 60 90 70 Q90 80 80 80"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                  />
                  {/* Circle around object */}
                  <Circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={backgroundColor}
                    strokeWidth="3"
                    strokeDasharray="5,5"
                  />
                  {/* Finger icon */}
                  <View style={{ position: 'absolute', top: 5, right: 5 }}>
                    <Ionicons name="hand-left" size={24} color={backgroundColor} />
                  </View>
                </Svg>
              </View>
            </View>
            <Text className="text-lg font-lexend-semibold text-gray-900 text-center mb-2">
              Draw around specific objects
            </Text>
            <Text className="text-sm font-lexend-regular text-gray-600 text-center">
              Perfect for capturing individual items when multiple objects are visible
            </Text>
          </View>

          {/* Benefits */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text className="text-sm font-lexend-regular text-gray-700 ml-2">
                More accurate identification
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text className="text-sm font-lexend-regular text-gray-700 ml-2">
                Capture exactly what you want
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            onPress={onClose}
            className="bg-primary rounded-full py-4 items-center mb-3"
            style={{ backgroundColor }}
          >
            <Text className="text-white font-lexend-semibold text-lg">Got it!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            className="py-2 items-center"
          >
            <Text className="text-gray-500 font-lexend-regular text-sm">Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default OnboardingCircleModal;