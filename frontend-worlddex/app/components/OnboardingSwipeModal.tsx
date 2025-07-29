import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Svg, Line, Path } from 'react-native-svg';
import { backgroundColor } from '../../src/utils/colors';
import { Ionicons } from '@expo/vector-icons';

interface OnboardingSwipeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const OnboardingSwipeModal: React.FC<OnboardingSwipeModalProps> = ({ visible, onClose }) => {
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
              <Ionicons name="flash" size={32} color={backgroundColor} />
            </View>
            <Text className="text-2xl font-lexend-bold text-gray-900">Speed Capture!</Text>
            <Text className="text-base font-lexend-regular text-gray-600 mt-2 text-center">
              The fastest way to catch objects
            </Text>
          </View>

          {/* Gesture Illustration */}
          <View className="bg-gray-50 rounded-2xl p-6 mb-6">
            <View className="items-center mb-4">
              <View className="relative">
                <Svg width={120} height={120} viewBox="0 0 120 120">
                  {/* Example objects */}
                  <Circle cx="30" cy="30" r="20" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="2" />
                  <Path
                    d="M70 20 L90 20 L90 40 L70 40 Z"
                    fill="#E5E7EB"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                  />
                  <Path
                    d="M20 70 L40 70 Q50 70 50 80 Q50 90 40 90 L20 90 Z"
                    fill="#E5E7EB"
                    stroke="#9CA3AF"
                    strokeWidth="2"
                  />
                  
                  {/* Swipe line */}
                  <Line
                    x1="20"
                    y1="20"
                    x2="100"
                    y2="100"
                    stroke={backgroundColor}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="8,4"
                  />
                  
                  {/* Arrow at end */}
                  <Path
                    d="M95 95 L100 100 L95 105 M105 95 L100 100 L100 100"
                    fill="none"
                    stroke={backgroundColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Finger icon */}
                  <View style={{ position: 'absolute', top: 0, left: 0 }}>
                    <Ionicons name="hand-left" size={24} color={backgroundColor} />
                  </View>
                </Svg>
              </View>
            </View>
            <Text className="text-lg font-lexend-semibold text-gray-900 text-center mb-2">
              Swipe across to capture
            </Text>
            <Text className="text-sm font-lexend-regular text-gray-600 text-center">
              Quick diagonal swipe captures anything in the path - perfect for rapid collecting!
            </Text>
          </View>

          {/* Benefits */}
          <View className="mb-6">
            <View className="flex-row items-center mb-2">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text className="text-sm font-lexend-regular text-gray-700 ml-2">
                Lightning fast captures
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text className="text-sm font-lexend-regular text-gray-700 ml-2">
                Great for moving objects
              </Text>
            </View>
          </View>

          {/* Pro tip */}
          <View className="bg-blue-50 rounded-xl p-3 mb-4">
            <Text className="text-sm font-lexend-medium text-blue-900">
              💡 Pro tip: Combine all three methods for maximum efficiency!
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={onClose}
            className="bg-primary rounded-full py-4 items-center"
            style={{ backgroundColor }}
          >
            <Text className="text-white font-lexend-semibold text-lg">Awesome!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default OnboardingSwipeModal;