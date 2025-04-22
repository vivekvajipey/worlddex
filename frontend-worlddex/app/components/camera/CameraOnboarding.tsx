// app/components/camera/CameraOnboarding.tsx
import React, { useRef, useEffect, useState } from "react"
import { Animated, Easing, Image, View, Text } from "react-native"
import Svg, { Circle, Line, Path } from "react-native-svg"
import Finger from "../../../assets/images/kid-named-finger.png"
import { backgroundColor } from "../../../src/utils/colors"

const ANIM_DURATION = 2000

export function CameraOnboarding({ onComplete }: { onComplete: () => void }) {
  // animation values & phase
  const progress = useRef(new Animated.Value(0)).current
  const [phase, setPhase] = useState<'circle'|'line'>('circle')

  // Start animations sequentially
  useEffect(() => {
    // Reset and start animation
    progress.setValue(0)
    
    // Run the appropriate animation
    Animated.timing(progress, { 
      toValue: 1, 
      duration: ANIM_DURATION, 
      easing: Easing.inOut(Easing.ease), 
      useNativeDriver: false 
    }).start(({ finished }) => {
      if (finished) {
        if (phase === 'circle') {
          // When circle animation completes, start line animation
          setPhase('line')
          progress.setValue(0)
          Animated.timing(progress, { 
            toValue: 1, 
            duration: ANIM_DURATION, 
            easing: Easing.inOut(Easing.ease), 
            useNativeDriver: false 
          }).start(onComplete)
        }
      }
    })
  }, [phase])

  // Animation parameters
  const RADIUS = 100
  const FINGER_SIZE = 32
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const CENTER_X = 100
  const CENTER_Y = 100
  
  // Circle animation
  const circleDashoffset = progress.interpolate({ 
    inputRange: [0, 1], 
    outputRange: [CIRCUMFERENCE, 0] 
  })
  
  // Calculate finger position on circle
  const fingerAngle = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2 * Math.PI]
  })
  
  // Convert angle to X,Y coordinates for the finger (positioned on circle edge)
  const fingerX = Animated.add(
    CENTER_X,
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0],
      extrapolate: 'clamp'
    }).interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1]
    }).interpolate({
      inputRange: [0, 1],
      outputRange: [0, RADIUS * Math.cos(Math.PI/2)]
    })
  )
  
  const fingerY = Animated.add(
    CENTER_Y,
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-RADIUS, -RADIUS * Math.cos(Math.PI*2)]
    })
  )
  
  // Line animation
  const LINE_LENGTH = Math.sqrt(200 * 200 + 200 * 200)
  const lineDashoffset = progress.interpolate({ 
    inputRange: [0, 1], 
    outputRange: [LINE_LENGTH, 0] 
  })
  
  // Diagonal finger movement
  const lineFingerX = progress.interpolate({ 
    inputRange: [0, 1], 
    outputRange: [0, 200] 
  })
  
  const lineFingerY = progress.interpolate({ 
    inputRange: [0, 1], 
    outputRange: [0, 200] 
  })
  
  // Create animated components
  const AnimatedCircle = Animated.createAnimatedComponent(Circle)
  const AnimatedLine = Animated.createAnimatedComponent(Line)

  return (
    <View className="absolute inset-0 flex items-center justify-center">
      <Text className="text-white text-lg mb-4 text-center px-4 font-lexend-medium">
        {phase === 'circle'
          ? 'Draw around the object to catch'
          : 'You can also swipe to catch'}
      </Text>
      <View className="relative w-[200px] h-[200px]">
        {phase === 'circle' && (
          <>
            <Svg width="200" height="200" viewBox="0 0 200 200" className="absolute inset-0">
              <AnimatedCircle
                cx={CENTER_X}
                cy={CENTER_Y}
                r={RADIUS - 3}
                stroke={backgroundColor}
                strokeWidth={3}
                strokeDasharray={[6, 4]}
                strokeDashoffset={circleDashoffset}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
            <Animated.View 
              className="absolute" 
              style={{
                transform: [
                  { translateX: fingerX },
                  { translateY: fingerY },
                  { translateX: -FINGER_SIZE/2 }, // Center the finger on its position
                  { translateY: -FINGER_SIZE/2 }
                ]
              }}
            >
              <Image
                source={Finger}
                className="w-8 h-8"
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
                strokeWidth={3}
                strokeDasharray={[6, 4]}
                strokeDashoffset={lineDashoffset}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>
            <Animated.View
              style={{
                position: 'absolute',
                transform: [
                  { translateX: lineFingerX },
                  { translateY: lineFingerY },
                  { translateX: -FINGER_SIZE/2 }, // Center the finger on its position
                  { translateY: -FINGER_SIZE/2 }
                ]
              }}
            >
              <Image
                source={Finger}
                className="w-8 h-8"
              />
            </Animated.View>
          </>
        )}
      </View>
    </View>
  )
}

export default CameraOnboarding;
