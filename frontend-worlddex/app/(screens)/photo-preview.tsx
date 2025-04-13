import React, { useState, useEffect, useRef } from "react";
import { View, Image, TouchableWithoutFeedback, Dimensions, Animated } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BlurView } from "expo-blur";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const POLAROID_MAX_WIDTH = SCREEN_WIDTH * 0.95;
const FRAME_EDGE_PADDING = POLAROID_MAX_WIDTH * 0.06;
const FRAME_BOTTOM_PADDING = POLAROID_MAX_WIDTH * 0.12;

const MAX_FRAME_HEIGHT = SCREEN_HEIGHT * 0.8;

const TARGET_POSITION = { x: 20, y: SCREEN_HEIGHT - 40 };

export default function PhotoPreview() {
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();
  const router = useRouter();
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState({ width: POLAROID_MAX_WIDTH, height: POLAROID_MAX_WIDTH });
  const [isMinimizing, setIsMinimizing] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const positionXAnim = useRef(new Animated.Value(0)).current;
  const positionYAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (photoUri) {
      Image.getSize(
        photoUri,
        (width, height) => {
          setImageSize({ width, height });

          const aspectRatio = width / height;

          if (aspectRatio >= 1) {
            const photoContainerWidth = POLAROID_MAX_WIDTH - (FRAME_EDGE_PADDING * 2);
            const photoContainerHeight = photoContainerWidth / aspectRatio;

            const totalFrameHeight = photoContainerHeight + FRAME_EDGE_PADDING + FRAME_BOTTOM_PADDING;

            if (totalFrameHeight > MAX_FRAME_HEIGHT) {
              const scale = MAX_FRAME_HEIGHT / totalFrameHeight;
              const scaledWidth = POLAROID_MAX_WIDTH * scale;

              setFrameSize({
                width: scaledWidth,
                height: MAX_FRAME_HEIGHT
              });
            } else {
              setFrameSize({
                width: POLAROID_MAX_WIDTH,
                height: totalFrameHeight
              });
            }
          } else {
            const maxPhotoHeight = MAX_FRAME_HEIGHT - FRAME_EDGE_PADDING - FRAME_BOTTOM_PADDING;
            const photoContainerHeight = maxPhotoHeight;
            const photoContainerWidth = photoContainerHeight * aspectRatio;

            if (photoContainerWidth + (FRAME_EDGE_PADDING * 2) > POLAROID_MAX_WIDTH) {
              const photoWidth = POLAROID_MAX_WIDTH - (FRAME_EDGE_PADDING * 2);
              const photoHeight = photoWidth / aspectRatio;

              setFrameSize({
                width: POLAROID_MAX_WIDTH,
                height: photoHeight + FRAME_EDGE_PADDING + FRAME_BOTTOM_PADDING
              });
            } else {
              const frameWidth = photoContainerWidth + (FRAME_EDGE_PADDING * 2);

              setFrameSize({
                width: frameWidth,
                height: photoContainerHeight + FRAME_EDGE_PADDING + FRAME_BOTTOM_PADDING
              });
            }
          }
        },
        (error) => console.log("Error getting image size:", error)
      );
    }
  }, [photoUri]);

  const runMinimizeAnimation = () => {
    setIsMinimizing(true);

    const centerX = SCREEN_WIDTH / 2 - frameSize.width / 2;
    const centerY = SCREEN_HEIGHT / 2 - frameSize.height / 2;

    const targetX = TARGET_POSITION.x - centerX;
    const targetY = TARGET_POSITION.y - centerY;

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(positionXAnim, {
        toValue: targetX,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(positionYAnim, {
        toValue: targetY,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        router.back();
      }
    });
  };

  const handleBackgroundPress = () => {
    runMinimizeAnimation();
  };

  const photoContainerWidth = frameSize.width - (FRAME_EDGE_PADDING * 2);
  const photoContainerHeight = frameSize.height - FRAME_EDGE_PADDING - FRAME_BOTTOM_PADDING;

  const animatedStyles = {
    transform: [
      { translateX: positionXAnim },
      { translateY: positionYAnim },
      { scale: scaleAnim },
      {
        rotate: rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '-10deg']
        })
      }
    ],
    opacity: opacityAnim,
  };

  return (
    <View className="flex-1">
      {/* Blurred overlay that allows camera to show through */}
      <BlurView
        intensity={30}
        tint="light"
        className="absolute inset-0"
      >
        {/* Make the blurred background clickable to dismiss */}
        <TouchableWithoutFeedback onPress={handleBackgroundPress}>
          <View className="flex-1" />
        </TouchableWithoutFeedback>
      </BlurView>

      {/* Polaroid frame - centered */}
      <View className="absolute inset-0 flex items-center justify-center">
        <Animated.View style={animatedStyles}>
          <View
            className="bg-white rounded-md shadow-lg overflow-hidden"
            style={{
              width: frameSize.width,
              height: frameSize.height,
            }}
          >
            {/* Photo container with dimensions based on image aspect ratio */}
            <View
              style={{
                width: photoContainerWidth,
                height: photoContainerHeight,
                marginTop: FRAME_EDGE_PADDING,
                marginHorizontal: FRAME_EDGE_PADDING,
              }}
              className="overflow-hidden"
            >
              {/* Photo itself - scaled to fit the container */}
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            {/* Bottom space - intentionally empty for future text */}
            <View style={{ height: FRAME_BOTTOM_PADDING }} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
} 