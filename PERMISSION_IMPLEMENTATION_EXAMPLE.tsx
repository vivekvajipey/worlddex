// Example implementation of permission priming for WorldDex

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Camera from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Permission configuration
const PERMISSION_CONFIG = {
  camera: {
    title: "Capture the World Around You 📸",
    message: "WorldDex uses your camera to identify and collect items from the real world. Take photos to build your collection!",
    icon: "camera" as const,
    iconColor: "#4F46E5",
    allowText: "Enable Camera",
    denyText: "Not Now",
    image: require('./assets/camera-permission-preview.png'), // Add an engaging preview image
  },
  location: {
    title: "Remember Where You Found It 📍",
    message: "Add location to your captures to see where you discovered each item. Build a map of your collection!",
    icon: "location" as const,
    iconColor: "#10B981",
    allowText: "Enable Location",
    denyText: "Skip for Now",
    image: require('./assets/location-permission-preview.png'),
  },
  notification: {
    title: "Daily Capture Reminders 🔔",
    message: "Get a friendly reminder each day to capture something new. Build your collection consistently!",
    icon: "notifications" as const,
    iconColor: "#F59E0B",
    allowText: "Enable Reminders",
    denyText: "Maybe Later",
    image: require('./assets/notification-permission-preview.png'),
  }
};

interface PermissionPrimerProps {
  visible: boolean;
  type: keyof typeof PERMISSION_CONFIG;
  onClose: () => void;
  onPermissionResult: (granted: boolean) => void;
}

export const PermissionPrimer: React.FC<PermissionPrimerProps> = ({
  visible,
  type,
  onClose,
  onPermissionResult
}) => {
  const config = PERMISSION_CONFIG[type];

  const handleAllow = async () => {
    // Mark that we've shown the primer
    await AsyncStorage.setItem(`permission_primer_shown_${type}`, 'true');
    
    // Request the actual permission
    let granted = false;
    switch (type) {
      case 'camera':
        const { status } = await Camera.requestCameraPermissionsAsync();
        granted = status === 'granted';
        break;
      // Add other permission types here
    }
    
    onPermissionResult(granted);
    onClose();
  };

  const handleDeny = async () => {
    // Mark that user soft-denied
    await AsyncStorage.setItem(`permission_soft_denied_${type}`, new Date().toISOString());
    onPermissionResult(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6 pb-10">
          {/* Icon */}
          <View className="items-center mb-4">
            <View className="w-20 h-20 rounded-full items-center justify-center" 
                  style={{ backgroundColor: config.iconColor + '20' }}>
              <Ionicons name={config.icon} size={40} color={config.iconColor} />
            </View>
          </View>

          {/* Title */}
          <Text className="text-2xl font-lexend-bold text-center mb-3">
            {config.title}
          </Text>

          {/* Message */}
          <Text className="text-base font-lexend-regular text-gray-600 text-center mb-6 px-4">
            {config.message}
          </Text>

          {/* Preview Image (optional) */}
          {config.image && (
            <Image 
              source={config.image} 
              className="w-full h-40 rounded-lg mb-6"
              resizeMode="cover"
            />
          )}

          {/* Buttons */}
          <TouchableOpacity
            onPress={handleAllow}
            className="bg-primary rounded-full py-4 mb-3"
          >
            <Text className="text-white font-lexend-semibold text-center text-lg">
              {config.allowText}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeny}
            className="py-4"
          >
            <Text className="text-gray-500 font-lexend-medium text-center text-base">
              {config.denyText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Usage in camera.tsx
export const CameraScreenWithPriming = () => {
  const [showCameraPrimer, setShowCameraPrimer] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<string | null>(null);

  // Check permission status on mount
  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    const { status } = await Camera.getCameraPermissionsAsync();
    setCameraPermission(status);
  };

  const handleCapturePress = async () => {
    if (cameraPermission === 'granted') {
      // Proceed with capture
      startCapture();
    } else if (cameraPermission === 'undetermined') {
      // Show primer for first-time users
      const primerShown = await AsyncStorage.getItem('permission_primer_shown_camera');
      if (!primerShown) {
        setShowCameraPrimer(true);
      } else {
        // If primer was shown before but permission still undetermined,
        // request directly (edge case)
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (status === 'granted') {
          startCapture();
        }
      }
    } else {
      // Permission was denied - show settings prompt
      showSettingsPrompt();
    }
  };

  const startCapture = () => {
    // Your capture logic here
  };

  const showSettingsPrompt = () => {
    Alert.alert(
      'Camera Access Required',
      'To capture items, please enable camera access in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  };

  return (
    <>
      {/* Your camera UI */}
      <TouchableOpacity onPress={handleCapturePress}>
        <Text>Capture</Text>
      </TouchableOpacity>

      {/* Permission Primer Modal */}
      <PermissionPrimer
        visible={showCameraPrimer}
        type="camera"
        onClose={() => setShowCameraPrimer(false)}
        onPermissionResult={(granted) => {
          if (granted) {
            startCapture();
          }
          checkCameraPermission(); // Update permission state
        }}
      />
    </>
  );
};

// Smart re-prompting logic
export const useSmartPermissionPrompt = (type: keyof typeof PERMISSION_CONFIG) => {
  const shouldShowPrimer = async (): Promise<boolean> => {
    // Check if permission already granted
    const currentStatus = await checkPermissionStatus(type);
    if (currentStatus === 'granted') return false;

    // Check if we've shown primer before
    const primerShown = await AsyncStorage.getItem(`permission_primer_shown_${type}`);
    if (!primerShown) return true;

    // Check if user soft-denied and enough time has passed
    const softDeniedDate = await AsyncStorage.getItem(`permission_soft_denied_${type}`);
    if (softDeniedDate) {
      const deniedTime = new Date(softDeniedDate).getTime();
      const now = new Date().getTime();
      const daysSinceDenied = (now - deniedTime) / (1000 * 60 * 60 * 24);
      
      // Re-prompt after 7 days for soft denials
      if (daysSinceDenied > 7) {
        return true;
      }
    }

    return false;
  };

  return { shouldShowPrimer };
};