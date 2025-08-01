import React from 'react';
import { View, ActivityIndicator, Text, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn, 
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';

interface LoadingBackgroundProps {
  message?: string;
  showSpinner?: boolean;
  variant?: 'warm' | 'cool' | 'sunset' | 'mint' | 'golden';
}

const gradientVariants = {
  warm: {
    colors: ['#FFF4ED', '#FFEDE0', '#FFE4CC'],
    locations: [0, 0.5, 1]
  },
  cool: {
    colors: ['#FFF4ED', '#F5F9FC', '#E8F4F8'],
    locations: [0, 0.6, 1]
  },
  sunset: {
    colors: ['#FFF4ED', '#FFE8D6', '#FFD6B3'],
    locations: [0, 0.5, 1]
  },
  mint: {
    colors: ['#FFF4ED', '#F0FBF4', '#E0F7E9'],
    locations: [0, 0.5, 1]
  },
  golden: {
    colors: ['#FFF4ED', '#FFF8E1', '#FFF4CC'],
    locations: [0, 0.5, 1]
  }
};

export const LoadingBackground: React.FC<LoadingBackgroundProps> = ({
  message = "Loading...",
  showSpinner = true,
  variant = 'warm'
}) => {
  const pulseValue = useSharedValue(0.5);
  const { width, height } = Dimensions.get('window');
  
  React.useEffect(() => {
    pulseValue.value = withRepeat(
      withTiming(1, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease)
      }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseValue.value
  }));

  const gradient = gradientVariants[variant];

  return (
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      style={{ width, height }}
    >
      <View className="flex-1 items-center justify-center">
        {/* Subtle animated circles for visual interest */}
        <View className="absolute">
          <Animated.View style={pulseStyle}>
            <View className="w-64 h-64 rounded-full bg-white/10" />
          </Animated.View>
        </View>
        <View className="absolute">
          <Animated.View style={[pulseStyle, { opacity: pulseValue.value * 0.5 }]}>
            <View className="w-96 h-96 rounded-full bg-primary/5" />
          </Animated.View>
        </View>
        
        {/* Loading content */}
        <View className="items-center">
          {showSpinner && (
            <View className="mb-4">
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          )}
          
          {message && (
            <Animated.View entering={FadeIn.delay(200)}>
              <Text className="text-text-primary/70 font-lexend-regular text-base text-center px-8">
                {message}
              </Text>
            </Animated.View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};