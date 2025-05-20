// app/components/camera/CameraOnboarding.tsx
import React, { useRef, useEffect, useState } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { Image } from "expo-image"
import { Svg, Circle, Line, Path } from "react-native-svg"
import Finger from "../../../assets/images/kid-named-finger.png"
import { backgroundColor } from "../../../src/utils/colors"
import { cancelAnimation } from 'react-native-reanimated';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedProps, 
  withTiming, 
  Easing,
  withSequence,
  withDelay,
  withRepeat,
  runOnJS
} from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import { usePostHog } from "posthog-react-native";

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedLine = Animated.createAnimatedComponent(Line)

const ANIM_DURATION = 2000
const TAP_DURATION = 500
const RADIUS = 100
const STROKE_WIDTH = 3
const FINGER_SIZE = 32
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CENTER_X = 100
const CENTER_Y = 100

type Phase = 'circle' | 'line' | 'double-tap' | 'capture-review' | 'logo-button' | 'profile-button'

interface CameraOnboardingProps {
  onComplete: () => void;
  capturesButtonClicked?: boolean;
  hasCapture?: boolean;
  showingCaptureReview?: boolean;
  captureLabel?: string;
  inDetailsModal?: boolean;
  onRequestReset?: () => void;
}

export function CameraOnboarding({ 
  onComplete, 
  capturesButtonClicked = false,
  hasCapture = false,
  showingCaptureReview = false,
  captureLabel = "",
  inDetailsModal = false,
  onRequestReset = () => {}
}: CameraOnboardingProps) {
  const posthog = usePostHog();

  useEffect(() => {
    // Track screen view when onboarding becomes visible
    if (posthog) {
      posthog.screen("Camera-Onboarding");
    }
  }, [posthog]);

  // Animation state
  const [phase, setPhase] = useState<Phase>(inDetailsModal ? 'capture-review' : 'circle')
  const progress = useSharedValue(0)
  const tapScale = useSharedValue(1)
  const arrowOpacity = useSharedValue(0)
  const arrowTranslateY = useSharedValue(0)
  
  // Check if we should move to the capture review phase when a capture is made
  useEffect(() => {
    // Skip to capture-review phase if a capture happens at any time during earlier phases
    if ((phase === 'circle' || phase === 'line' || phase === 'double-tap') && showingCaptureReview) {
      console.log("Skipping to capture review phase")
      setPhase('capture-review')
    } else if (phase === 'capture-review' && !showingCaptureReview && hasCapture) {
      console.log("Moving to profile button phase")
      setPhase('profile-button')
    } else if (phase === 'profile-button' && capturesButtonClicked) {
      console.log("Moving to logo button phase")
      setPhase('logo-button')
    }
  }, [showingCaptureReview, phase, hasCapture, capturesButtonClicked])
  
  // Auto transition from profile to collection after delay
  useEffect(() => {
    if (phase === 'profile-button') {
      // TEMPORARILY DISABLED: Auto-transition to logo button phase
      const timeout = setTimeout(() => {
        console.log("Auto-transitioning to logo button phase")
        setPhase('logo-button')
      }, 4000); // Show profile for 4 seconds before transitioning
      
      return () => clearTimeout(timeout);
    }
  }, [phase]);
  
  // Check if captures button has been clicked to complete onboarding
  useEffect(() => {
    if (phase === 'logo-button' && capturesButtonClicked) {
      // User has clicked the captures button, complete onboarding
      onComplete()
    }
  }, [capturesButtonClicked, phase, onComplete])
  
  // Start animations
  useEffect(() => {
    const startAnimation = () => {
      // Reset to beginning
      progress.value = 0
      
      if (phase === 'circle' || phase === 'line') {
        return;
      }
      
      if (phase === 'double-tap') {
        // Double tap animation
        // First tap
        tapScale.value = withSequence(
          withTiming(1.3, { duration: TAP_DURATION / 2 }),
          withTiming(1, { duration: TAP_DURATION / 2 }),
          // Small pause between taps
          withDelay(300, 
            // Second tap
            withSequence(
              withTiming(1.3, { duration: TAP_DURATION / 2 }),
              withTiming(1, { duration: TAP_DURATION / 2 }, (finished) => {
                if (finished) {
                  // Instead of automatically moving to next phase,
                  // we repeat the double-tap animation until the user makes a capture
                  runOnJS(startAnimation)()
                }
              })
            )
          )
        )
      } else if (phase === 'capture-review') {
        // Skip to logo-button if we're in the modal
        if (inDetailsModal) {
          // Start continuous pulsing animation for highlighting the close button
          arrowOpacity.value = withTiming(1, { duration: 500 })
          
          // Continuous pulsing animation for close button
          arrowTranslateY.value = withRepeat(
            withSequence(
              withTiming(1.2, { duration: 1000 }),
              withTiming(1, { duration: 1000 })
            ),
            -1, // repeat indefinitely
            true // reverse each time
          )
        } else {
          // When review is complete, we'll move to profile-button phase
          // This happens when the PolaroidDevelopment is dismissed
          if (!showingCaptureReview && hasCapture) {
            runOnJS(setPhase)('profile-button')
          }
        }
      } else if (phase === 'profile-button') {
        // Start continuous bobbing animation for the arrow
        arrowOpacity.value = withTiming(1, { duration: 500 })
        
        // Continuous bobbing animation that repeats indefinitely
        arrowTranslateY.value = withRepeat(
          withSequence(
            withTiming(-10, { duration: 1000 }),
            withTiming(0, { duration: 1000 })
          ),
          -1, // repeat indefinitely
          true // reverse each time
        )
      } else if (phase === 'logo-button') {
        // Start continuous bobbing animation for the arrow
        arrowOpacity.value = withTiming(1, { duration: 500 })
        
        // Continuous bobbing animation that repeats indefinitely
        arrowTranslateY.value = withRepeat(
          withSequence(
            withTiming(-10, { duration: 1000 }),
            withTiming(0, { duration: 1000 })
          ),
          -1, // repeat indefinitely
          true // reverse each time
        )
      }
    }
    
    startAnimation()
  }, [phase, hasCapture, showingCaptureReview, inDetailsModal])
  
  // Circle animation props
  const circleAnimatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: CIRCUMFERENCE * (1 - progress.value)
    }
  })

  useEffect(() => {
    if (phase !== 'circle' && phase !== 'line') return;
  
    // stop whatever was running before
    cancelAnimation(progress);
  
    // hard‑reset, then draw the arc / swipe
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: ANIM_DURATION, easing: Easing.inOut(Easing.ease) },
      (finished) => {
        if (finished) {
          runOnJS(setPhase)(phase === 'circle' ? 'line' : 'double-tap');
        }
      }
    );
  }, [phase]);          // ← runs only when the phase actually changes
  
  // Finger animation for circle
  const fingerCircleStyle = useAnimatedStyle(() => {
    // Adjust the angle based on the drawing direction
    // SVG dash offset draws clockwise from 3 o'clock position (right side)
    const angle = progress.value * 2 * Math.PI
    
    // Calculate position on circle using sine and cosine
    // For clockwise movement (start at right, go down)
    // Add half stroke width to position finger exactly on the stroke
    const effectiveRadius = RADIUS + STROKE_WIDTH/2
    const x = CENTER_X + effectiveRadius * Math.cos(angle) - FINGER_SIZE/2
    const y = CENTER_Y + effectiveRadius * Math.sin(angle) - FINGER_SIZE/2
    
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      transform: [
        { translateX: x },
        { translateY: y }
      ]
    }
  })
  
  // Line animation props
  const LINE_LENGTH = Math.sqrt(200 * 200 + 200 * 200)
  const lineAnimatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: LINE_LENGTH * (1 - progress.value)
    }
  })
  
  // Finger animation for line
  const fingerLineStyle = useAnimatedStyle(() => {
    // Add half stroke width offset for precise positioning
    const x = progress.value * 200 - FINGER_SIZE/2 + STROKE_WIDTH/2
    const y = progress.value * 200 - FINGER_SIZE/2 + STROKE_WIDTH/2
    
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      transform: [
        { translateX: x },
        { translateY: y }
      ]
    }
  })
  
  // Double-tap finger style
  const fingerDoubleTapStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: CENTER_X - FINGER_SIZE/2,
      top: CENTER_Y - FINGER_SIZE/2,
      transform: [
        { scale: tapScale.value }
      ]
    }
  })
  
  // Add profile button arrow style - using absolute positioning with specific values
  const profileArrowStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      // Absolute positioning from edges
      right: 40,
      bottom: 85,
      opacity: arrowOpacity.value,
      transform: [
        { translateY: arrowTranslateY.value }
      ]
    }
  })

  // Arrow animation for logo button or highlight for close button
  const arrowStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      bottom: inDetailsModal ? undefined : phase === 'logo-button' ? 90 : undefined, // Position above bottom button if logo-button phase
      top: inDetailsModal ? 12 : undefined, // Position near top in modal
      right: inDetailsModal ? 4 : undefined, // Align with close button in modal
      alignSelf: inDetailsModal ? undefined : phase === 'logo-button' ? 'center' : undefined, // Center only if logo-button phase
      opacity: arrowOpacity.value,
      transform: inDetailsModal 
        ? [{ scale: arrowTranslateY.value }]  // Pulse effect for close button
        : [{ translateY: arrowTranslateY.value }] // Bobbing for buttons
    }
  })

  useEffect(() => {
    if (phase === "double-tap") {
      const id = setTimeout(() => {
        // instead of trying to rewind phases,
        // ask the parent to remount us
        onRequestReset();
      }, 1500);
      return () => clearTimeout(id);
    }
  }, [phase, onRequestReset]);
  
  if (inDetailsModal && phase === 'capture-review') {
    // Special layout for modal view - highlight the close button
    return (
      <View className="absolute inset-0 pointer-events-none">
        <View className="absolute inset-x-0 top-0 px-4 py-12 items-center">
          <Text className="text-white text-lg text-center px-4 font-lexend-medium bg-black/60 py-2 rounded-lg">
            Great! You caught a {captureLabel}!
          </Text>
          <Text className="text-white text-base mt-3 text-center font-lexend-regular bg-black/60 py-2 px-4 rounded-lg">
            Tap the X button to return to camera
          </Text>
        </View>
        
        {/* Highlight for close button */}
        <Animated.View style={arrowStyle}>
          <View className="w-12 h-12 rounded-full border-2 border-primary" />
        </Animated.View>
      </View>
    );
  }

  return (
    <View 
      className="absolute inset-0 flex items-center justify-center"
      pointerEvents="box-none"
    >
      <Text className="text-white text-lg mb-4 text-center px-4 font-lexend-medium">
        {phase === 'circle'
          ? 'Draw around any object to catch it!'
          : phase === 'line'
          ? 'You can also swipe across to catch'
          : phase === 'double-tap'
          ? 'Double-tap to catch the entire view!'
          : phase === 'capture-review'
          ? ``
          : phase === 'profile-button'
          ? ''
          : ''
        }
      </Text>
      
      {(phase === 'circle' || phase === 'line') && (
        <View className="relative w-[200px] h-[200px]">
          {phase === 'circle' && (
            <>
              <Svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0">
                <AnimatedCircle
                  cx={CENTER_X}
                  cy={CENTER_Y}
                  r={RADIUS}
                  stroke={backgroundColor}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={CIRCUMFERENCE}
                  animatedProps={circleAnimatedProps}
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
              
              <Animated.View style={fingerCircleStyle}>
                <Image
                  source={Finger}
                  style={{ width: 32, height: 32 }}
                  contentFit="contain"
                />
              </Animated.View>
            </>
          )}
          
          {phase === 'line' && (
            <>
              <Svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0">
                <AnimatedLine
                  x1={0}
                  y1={0}
                  x2={200}
                  y2={200}
                  stroke={backgroundColor}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={LINE_LENGTH}
                  animatedProps={lineAnimatedProps}
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
              
              <Animated.View style={fingerLineStyle}>
                <Image
                  source={Finger}
                  style={{ width: 32, height: 32 }}
                  contentFit="contain"
                />
              </Animated.View>
            </>
          )}
        </View>
      )}
      
      {phase === 'double-tap' && (
        <View className="relative w-[200px] h-[200px] items-center justify-center">
          <Animated.View style={fingerDoubleTapStyle}>
            <Image
              source={Finger}
              style={{ width: 32, height: 32 }}
              contentFit="contain"
            />
          </Animated.View>
        </View>
      )}
      
      {/* Profile button phase - with absolute positioning for text */}
      {phase === 'profile-button' && (
        <View className="absolute inset-0 pointer-events-none">
          {/* Absolutely positioned text */}
          <View style={{
            position: 'absolute',
            right: 3,
            bottom: 125,
            maxWidth: 120
          }}>
            <Text className="text-white text-base font-lexend-medium bg-black/60 p-2 rounded-lg text-center">
              Update your profile!
            </Text>
          </View>
          
          {/* Arrow pointing to bottom right profile button - absolute position */}
          <Animated.View style={profileArrowStyle}>
            <View className="flex items-center">
              <View className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                <Ionicons name="arrow-down" size={16} color="white" />
              </View>
            </View>
          </Animated.View>
        </View>
      )}
      
      {phase === 'logo-button' && (
        <View className="absolute inset-0 items-center justify-end pointer-events-none">
          {/* Text positioned higher */}
          <Text className="text-white text-lg text-center mb-40 font-lexend-medium bg-black/60 p-2 rounded-lg max-w-[250px]">
            See your captures here
          </Text>
          
          {/* Better arrow pointing to bottom center button - half size */}
          <Animated.View style={arrowStyle}>
            <View className="flex items-center">
              <View className="w-8 h-8 rounded-full border-2 border-white mb-4 flex items-center justify-center">
                <Ionicons name="arrow-down" size={16} color="white" />
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  )
}

export default CameraOnboarding;
