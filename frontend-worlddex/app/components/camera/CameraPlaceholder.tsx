import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Using expo-camera's permission status type for now
type PermissionStatus = 'undetermined' | 'granted' | 'denied' | 'restricted';

interface CameraPlaceholderProps {
  onRequestPermission: () => void;
  permissionStatus: PermissionStatus;
}

export const CameraPlaceholder: React.FC<CameraPlaceholderProps> = ({
  onRequestPermission,
  permissionStatus
}) => {
  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  return (
    <View className="flex-1 bg-black justify-center items-center px-8">
      {/* Camera Icon */}
      <View className="w-24 h-24 rounded-full bg-gray-900 items-center justify-center mb-8">
        <Ionicons name="camera" size={48} color="#6B7280" />
      </View>

      {permissionStatus === 'undetermined' && (
        <>
          <Text className="text-white text-2xl font-lexend-semibold mb-3 text-center">
            Ready to explore the world?
          </Text>
          <Text className="text-gray-400 text-base font-lexend-regular mb-8 text-center">
            WorldDex uses your camera to identify and capture items from the world around you
          </Text>
          <TouchableOpacity
            onPress={onRequestPermission}
            className="bg-primary px-8 py-4 rounded-full"
            activeOpacity={0.8}
          >
            <Text className="text-white font-lexend-semibold text-lg">
              Enable Camera
            </Text>
          </TouchableOpacity>
        </>
      )}

      {permissionStatus === 'denied' && (
        <>
          <Text className="text-white text-xl font-lexend-semibold mb-3 text-center">
            Camera access needed
          </Text>
          <Text className="text-gray-400 text-base font-lexend-regular mb-8 text-center">
            To capture items, please enable camera access in your device settings
          </Text>
          <TouchableOpacity
            onPress={handleOpenSettings}
            className="bg-primary px-8 py-4 rounded-full flex-row items-center"
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text className="text-white font-lexend-semibold text-lg">
              Open Settings
            </Text>
          </TouchableOpacity>
        </>
      )}

      {permissionStatus === 'restricted' && (
        <>
          <Text className="text-white text-xl font-lexend-semibold mb-3 text-center">
            Camera access restricted
          </Text>
          <Text className="text-gray-400 text-base font-lexend-regular text-center">
            Camera access has been restricted by device policies or parental controls
          </Text>
        </>
      )}
    </View>
  );
};