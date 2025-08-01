import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  iconColor?: string;
  iconSize?: number;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "images-outline",
  title,
  subtitle,
  children,
  iconColor = "#CBD5E1",
  iconSize = 64
}) => {
  return (
    <View className="py-20 items-center px-4">
      <Ionicons name={icon} size={iconSize} color={iconColor} />
      <Text className="text-text-primary mt-4 text-lg font-lexend-medium text-center">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-text-secondary mt-2 text-center max-w-xs font-lexend-regular">
          {subtitle}
        </Text>
      )}
      {children && (
        <View className="mt-4">
          {children}
        </View>
      )}
    </View>
  );
};

export default EmptyState;