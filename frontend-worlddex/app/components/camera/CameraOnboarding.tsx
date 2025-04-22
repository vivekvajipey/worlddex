// app/components/camera/CameraOnboarding.tsx
import { useRef, useEffect, useState } from "react"
import { Animated, Easing, Image, View, Text } from "react-native"
import Svg, { Circle, Line } from "react-native-svg"
import Finger from "../../../assets/images/kid-named-finger.png"   // a small finger PNG in your assets
import { backgroundColor } from "../../../src/utils/colors"

const ANIM_DURATION = 2000

export function CameraOnboarding({ onComplete }: { onComplete: () => void }) {
  // animation values & phase
  const circleProgress = useRef(new Animated.Value(0)).current
  const lineProgress = useRef(new Animated.Value(0)).current
  const [phase, setPhase] = useState<'circle'|'line'>('circle')

  useEffect(() => {
    Animated.timing(circleProgress, { toValue: 1, duration: ANIM_DURATION, easing: Easing.inOut(Easing.ease), useNativeDriver: false })
      .start(() => {
        setPhase('line')
        Animated.timing(lineProgress, { toValue: 1, duration: ANIM_DURATION, easing: Easing.inOut(Easing.ease), useNativeDriver: false })
          .start(onComplete)
      })
  }, [])

  // animation parameters
  const RADIUS = 100
  const FINGER_SIZE = 32
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const circleDashoffset = circleProgress.interpolate({ inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0] })
  const LINE_LENGTH = Math.sqrt(200 * 200 + 200 * 200)
  const lineDashoffset = lineProgress.interpolate({ inputRange: [0, 1], outputRange: [LINE_LENGTH, 0] })
  const circleRotate = circleProgress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] })
  const diagonalTranslate = lineProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 200] })
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
                cx={RADIUS}
                cy={RADIUS}
                r={RADIUS - 3}
                stroke={backgroundColor}
                strokeWidth={3}
                strokeDasharray={[6, 4]}
                strokeDashoffset={circleDashoffset}
                fill="none"
              />
            </Svg>
            <Animated.View className="absolute inset-0" style={{ transform: [{ rotate: circleRotate }] }} pointerEvents="none">
              <Image
                source={Finger}
                className="absolute w-8 h-8"
                style={{ top: -(FINGER_SIZE / 2), left: (RADIUS - FINGER_SIZE / 2) }}
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
              />
            </Svg>
            <Animated.Image
              source={Finger}
              className="absolute w-8 h-8"
              style={[
                { transform: [{ translateX: diagonalTranslate }, { translateY: diagonalTranslate }] },
                { opacity: lineProgress }
              ]}
            />
          </>
        )}
      </View>
    </View>
  )
}

export default CameraOnboarding;
