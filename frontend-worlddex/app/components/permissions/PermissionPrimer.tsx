import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

// Permission type definitions
export type PermissionType = 'camera' | 'notification' | 'photoLibrary';

// Configuration for each permission type
const PERMISSION_CONFIG: Record<PermissionType, {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  message: string;
  allowText: string;
  denyText: string;
}> = {
  camera: {
    icon: 'camera',
    iconColor: '#4F46E5',
    title: 'Camera Access',
    message: 'WorldDex uses your camera to identify and capture items from the real world. Take photos to build your collection!',
    allowText: 'Enable Camera',
    denyText: 'Not Now'
  },
  notification: {
    icon: 'notifications',
    iconColor: '#F59E0B',
    title: 'Daily Reminders',
    message: 'Get a friendly reminder each day to capture something new. Build your collection consistently!',
    allowText: 'Enable Notifications',
    denyText: 'Maybe Later'
  },
  photoLibrary: {
    icon: 'images',
    iconColor: '#10B981',
    title: 'Photo Library Access',
    message: 'Select images from your library to customize your profile and collections.',
    allowText: 'Allow Access',
    denyText: 'Not Now'
  }
};

interface PermissionPrimerProps {
  visible: boolean;
  type: PermissionType;
  onAllow: () => void;
  onDeny: () => void;
}

export const PermissionPrimer: React.FC<PermissionPrimerProps> = ({
  visible,
  type,
  onAllow,
  onDeny
}) => {
  const config = PERMISSION_CONFIG[type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <BlurView intensity={80} tint="dark" style={{ flex: 1 }}>
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            {/* Icon */}
            <View className="items-center mb-6">
              <View 
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: config.iconColor + '20' }}
              >
                <Ionicons name={config.icon} size={40} color={config.iconColor} />
              </View>
            </View>

            {/* Title */}
            <Text className="text-2xl font-lexend-semibold text-gray-900 text-center mb-3">
              {config.title}
            </Text>

            {/* Message */}
            <Text className="text-base font-lexend-regular text-gray-600 text-center mb-8 px-2">
              {config.message}
            </Text>

            {/* Allow Button */}
            <TouchableOpacity
              onPress={onAllow}
              className="bg-primary rounded-full py-4 mb-3"
              activeOpacity={0.8}
            >
              <Text className="text-white font-lexend-semibold text-center text-base">
                {config.allowText}
              </Text>
            </TouchableOpacity>

            {/* Deny Button */}
            <TouchableOpacity
              onPress={onDeny}
              className="py-4"
              activeOpacity={0.8}
            >
              <Text className="text-gray-500 font-lexend-medium text-center text-base">
                {config.denyText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};