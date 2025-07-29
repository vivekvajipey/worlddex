import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withDelay, 
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface CameraTutorialOverlayProps {
  visible: boolean;
  onComplete?: () => void;
}

export const CameraTutorialOverlay: React.FC<CameraTutorialOverlayProps> = ({ 
  visible, 
  onComplete 
}) => {
  const tapScale = useSharedValue(1);
  const tapOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Fade in text
      textOpacity.value = withTiming(1, { duration: 500 });
      
      // Start tap animation after a brief delay
      tapOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));
      
      // Double tap animation loop
      tapScale.value = withDelay(
        600,
        withRepeat(
          withSequence(
            // First tap
            withTiming(1.4, { duration: 200, easing: Easing.out(Easing.ease) }),
            withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) }),
            // Pause between taps
            withDelay(200, 
              // Second tap
              withSequence(
                withTiming(1.4, { duration: 200, easing: Easing.out(Easing.ease) }),
                withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) }),
                // Longer pause before repeat
                withDelay(1000, withTiming(1, { duration: 0 }))
              )
            )
          ),
          -1, // Repeat indefinitely
          false
        )
      );
    } else {
      // Cancel animations when not visible
      cancelAnimation(tapScale);
      cancelAnimation(tapOpacity);
      cancelAnimation(textOpacity);
      
      tapScale.value = 1;
      tapOpacity.value = 0;
      textOpacity.value = 0;
    }
    
    return () => {
      cancelAnimation(tapScale);
      cancelAnimation(tapOpacity);
      cancelAnimation(textOpacity);
    };
  }, [visible]);

  const tapAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
    opacity: tapOpacity.value
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value
  }));

  if (!visible) return null;

  return (
    <View 
      className="absolute inset-0 items-center justify-center" 
      pointerEvents="none"
    >
      {/* Semi-transparent backdrop for better text visibility */}
      <View className="absolute inset-0 bg-black/20" />
      
      {/* Tutorial text */}
      <Animated.View 
        style={textAnimatedStyle}
        className="absolute top-32 px-6"
      >
        <View className="bg-black/70 rounded-2xl px-6 py-4">
          <Text className="text-white text-lg font-lexend-semibold text-center">
            Double-tap anywhere to capture!
          </Text>
          <Text className="text-white/80 text-sm font-lexend-regular text-center mt-1">
            Point your camera at any object
          </Text>
        </View>
      </Animated.View>

      {/* Double tap animation */}
      <Animated.View style={tapAnimatedStyle}>
        <View className="relative">
          {/* Tap ripple effect */}
          <View className="absolute inset-0 items-center justify-center">
            <View className="w-24 h-24 rounded-full bg-white/20" />
          </View>
          
          {/* Hand icon */}
          <View className="w-24 h-24 items-center justify-center">
            <Ionicons name="hand-left" size={48} color="white" />
            
            {/* Double tap indicators */}
            <View className="absolute bottom-4 right-4 flex-row">
              <View className="w-3 h-3 rounded-full bg-white mr-1" />
              <View className="w-3 h-3 rounded-full bg-white" />
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Skip hint */}
      <Animated.View 
        style={textAnimatedStyle}
        className="absolute bottom-32"
      >
        <Text className="text-white/60 text-sm font-lexend-regular">
          Try it now!
        </Text>
      </Animated.View>
    </View>
  );
};

export default CameraTutorialOverlay;