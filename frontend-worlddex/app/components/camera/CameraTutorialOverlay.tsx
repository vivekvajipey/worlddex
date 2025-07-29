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
  const rippleScale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Fade in text
      textOpacity.value = withTiming(1, { duration: 500 });
      
      // Start tap animation after a brief delay
      tapOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));
      
      // Double tap animation loop - much faster, more realistic
      tapScale.value = withDelay(
        600,
        withRepeat(
          withSequence(
            // First tap with ripple
            withTiming(0.8, { duration: 80, easing: Easing.out(Easing.ease) }),
            withTiming(1, { duration: 80, easing: Easing.in(Easing.ease) }),
            // Very short pause between taps (realistic double-tap)
            withDelay(60, 
              // Second tap
              withSequence(
                withTiming(0.8, { duration: 80, easing: Easing.out(Easing.ease) }),
                withTiming(1, { duration: 80, easing: Easing.in(Easing.ease) }),
                // Longer pause before repeat
                withDelay(2500, withTiming(1, { duration: 0 }))
              )
            )
          ),
          -1, // Repeat indefinitely
          false
        )
      );
      
      // Ripple effect commented out for now
      /*
      rippleScale.value = withDelay(
        600,
        withRepeat(
          withSequence(
            // First tap ripple - starts immediately with tap
            withSequence(
              withTiming(1, { duration: 0 }),
              withTiming(2, { duration: 300 })
            ),
            // Reset and second tap ripple - delay matches when second tap starts (160ms + 60ms pause = 220ms)
            withDelay(220,
              withSequence(
                withTiming(1, { duration: 0 }),
                withTiming(2, { duration: 300 }),
                withDelay(1200, withTiming(1, { duration: 0 }))
              )
            )
          ),
          -1,
          false
        )
      );
      
      rippleOpacity.value = withDelay(
        600,
        withRepeat(
          withSequence(
            // First tap ripple fade
            withSequence(
              withTiming(0.3, { duration: 0 }),
              withTiming(0, { duration: 300 })
            ),
            // Second tap ripple fade - same delay as scale
            withDelay(220,
              withSequence(
                withTiming(0.3, { duration: 0 }),
                withTiming(0, { duration: 300 }),
                withDelay(1200, withTiming(0, { duration: 0 }))
              )
            )
          ),
          -1,
          false
        )
      );
      */
    } else {
      // Cancel animations when not visible
      cancelAnimation(tapScale);
      cancelAnimation(tapOpacity);
      cancelAnimation(textOpacity);
      // cancelAnimation(rippleScale);
      // cancelAnimation(rippleOpacity);
      
      tapScale.value = 1;
      tapOpacity.value = 0;
      textOpacity.value = 0;
    }
    
    return () => {
      cancelAnimation(tapScale);
      cancelAnimation(tapOpacity);
      cancelAnimation(textOpacity);
      // cancelAnimation(rippleScale);
      // cancelAnimation(rippleOpacity);
    };
  }, [visible]);

  const tapAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
    opacity: tapOpacity.value
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value
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
      <View className="relative">
        {/* Ripple effect commented out */}
        {/*
        <Animated.View 
          style={[rippleAnimatedStyle, { position: 'absolute' }]}
          className="w-24 h-24 items-center justify-center"
        >
          <View className="w-24 h-24 rounded-full bg-white/30" />
        </Animated.View>
        */}
        
        {/* Finger tap */}
        <Animated.View style={tapAnimatedStyle}>
          <View className="w-24 h-24 items-center justify-center">
            {/* Finger representation - simple circle */}
            <View className="w-10 h-10 rounded-full bg-white shadow-lg" />
          </View>
        </Animated.View>
      </View>

      {/* Skip hint
      <Animated.View 
        style={textAnimatedStyle}
        className="absolute bottom-32"
      >
        <Text className="text-white/60 text-sm font-lexend-regular">
          Try it now!
        </Text>
      </Animated.View> */}
    </View>
  );
};

export default CameraTutorialOverlay;