import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StyledAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export default function StyledAlert({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  icon,
  iconColor = '#F59E0B' // Default to amber color
}: StyledAlertProps) {
  const [modalVisible, setModalVisible] = useState(visible);
  const [scaleValue] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
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
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const handleButtonPress = (button: typeof buttons[0]) => {
    if (button.onPress) {
      button.onPress();
    }
  };

  if (!modalVisible) return null;

  return (
    <Modal
      transparent
      visible={modalVisible}
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
          {/* Icon */}
          {icon && (
            <View className="items-center mb-4">
              <View className="bg-primary/10 rounded-full p-3">
                <Ionicons name={icon} size={32} color={iconColor} />
              </View>
            </View>
          )}

          {/* Title */}
          <Text className="text-text-primary font-lexend-bold text-xl text-center mb-2">
            {title}
          </Text>

          {/* Message */}
          <Text className="text-text-secondary font-lexend-regular text-base text-center mb-6">
            {message}
          </Text>

          {/* Buttons */}
          <View className={`${buttons.length > 1 ? 'flex-row justify-between' : ''}`}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleButtonPress(button)}
                className={`
                  ${button.style === 'destructive' ? 'bg-red-500' : 
                    button.style === 'cancel' ? 'bg-gray-500' : 'bg-primary'}
                  rounded-full px-6 py-3
                  ${buttons.length > 1 ? 'flex-1' : 'w-full'}
                  ${index > 0 && buttons.length > 1 ? 'ml-2' : ''}
                `}
                activeOpacity={0.8}
              >
                <Text className="text-surface font-lexend-semibold text-center text-base">
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}