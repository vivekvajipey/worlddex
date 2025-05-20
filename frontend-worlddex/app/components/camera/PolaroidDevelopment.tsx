import React, { useRef, useEffect, useState } from "react";
import { View, Animated, Dimensions, TouchableWithoutFeedback, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";
import { backgroundColor } from "../../../src/utils/colors";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUser } from "../../../database/hooks/useUsers";
import { usePostHog } from "posthog-react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Polaroid dimensions for the final preview state
const POLAROID_MAX_WIDTH = SCREEN_WIDTH * 0.95;
const FRAME_EDGE_PADDING = POLAROID_MAX_WIDTH * 0.06;
const FRAME_BOTTOM_PADDING = POLAROID_MAX_WIDTH * 0.18; // larger bottom padding for label
const MAX_FRAME_HEIGHT = SCREEN_HEIGHT * 0.8;

// Initial blur intensity (lower at the beginning)
const INITIAL_BLUR = 15;
const FINAL_BLUR = 30;

// Target position for minimizing animation
const TARGET_POSITION = { x: 20, y: SCREEN_HEIGHT - 40 };

interface PolaroidDevelopmentProps {
  photoUri: string;
  captureBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio: number;
  };
  onDismiss: () => void;
  captureSuccess: boolean | null;
  isIdentifying?: boolean;
  label?: string; // Optional string for the identified subject
  onReject?: () => void; // Optional function to reject the capture
  onSetPublic?: (isPublic: boolean) => void; // Callback for public/private toggle
  identificationComplete?: boolean; // prop to indicate when all identification is complete
}

export default function PolaroidDevelopment({
  photoUri,
  captureBox,
  onDismiss,
  captureSuccess,
  isIdentifying = false,
  label,
  onReject,
  onSetPublic,
  identificationComplete = false // Default to false for backward compatibility
}: PolaroidDevelopmentProps) {
  // Add logging for props
  console.log("==== POLAROID DEVELOPMENT PROPS ====");
  console.log("captureSuccess:", captureSuccess);
  console.log("isIdentifying:", isIdentifying);
  console.log("label:", label);

  // Get user settings
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const { user } = useUser(userId);

  // Animation values - initialize with their starting values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const blurIntensityRef = useRef({ value: INITIAL_BLUR });
  const blurIntensity = useRef(new Animated.Value(INITIAL_BLUR)).current;

  // Loading animation values
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  // Minimizing animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const positionXAnim = useRef(new Animated.Value(0)).current;
  const positionYAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Rip animation values
  const leftPieceAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const rightPieceAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const leftRotateAnim = useRef(new Animated.Value(0)).current;
  const rightRotateAnim = useRef(new Animated.Value(0)).current;

  // State tracking
  const [isMinimizing, setIsMinimizing] = useState(false);
  const [isRipping, setIsRipping] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [initialAnimationDone, setInitialAnimationDone] = useState(false);

  // Public/private toggle state - initialize with user's default preference
  const [isPublic, setIsPublic] = useState(false);

  // Set the initial public/private setting based on user's default preference
  useEffect(() => {
    if (user) {
      setIsPublic(user.default_public_captures || false);
    }
  }, [user]);

  const posthog = usePostHog();

  // Track identification result when complete
  useEffect(() => {
    if (identificationComplete && posthog) {
      if (captureSuccess === true) {
        posthog.capture("object_identified", {
          objectType: label || "unknown"
        });
      } else if (captureSuccess === false) {
        posthog.capture("identification_failed");
      }
    }
  }, [identificationComplete, captureSuccess, label, posthog]);

  // Calculate final dimensions for the polaroid
  const targetDimensions = calculateTargetDimensions(captureBox.aspectRatio);

  // Run the development animation sequence once on mount
  useEffect(() => {
    // Create and start the animation sequence
    runDevelopmentAnimation();

    // Add a listener to update our ref that we use for the blur intensity
    const listener = blurIntensity.addListener((state) => {
      blurIntensityRef.current.value = state.value;
    });

    // Clean up listener on unmount
    return () => {
      blurIntensity.removeListener(listener);
    };
  }, []);

  // Loading dots animation
  useEffect(() => {
    if (isIdentifying && captureSuccess === null) {
      // Create animations for the loading dots
      const dot1Animation = Animated.loop(
        Animated.sequence([
          Animated.timing(dot1Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(dot1Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true
          })
        ])
      );

      const dot2Animation = Animated.loop(
        Animated.sequence([
          Animated.delay(150),
          Animated.timing(dot2Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(dot2Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.delay(150)
        ])
      );

      const dot3Animation = Animated.loop(
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(dot3Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(dot3Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.delay(300)
        ])
      );

      // Start all animations
      dot1Animation.start();
      dot2Animation.start();
      dot3Animation.start();

      // Clean up on component unmount or when identification is done
      return () => {
        dot1Animation.stop();
        dot2Animation.stop();
        dot3Animation.stop();
      };
    }
  }, [isIdentifying, captureSuccess]);

  // Animation sequence for Polaroid development
  function runDevelopmentAnimation() {
    // 1. Fade from white to reveal image
    const fadeAnimation = Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 2500,
      useNativeDriver: true,
    });

    // 2. Add subtle shake during development
    const shakeAnimation = Animated.sequence([
      Animated.delay(1000),
      Animated.timing(shakeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ]);

    // 3. Run fade and shake animations together
    Animated.parallel([
      fadeAnimation,
      shakeAnimation
    ]).start(() => {
      // 4. Then expand to final position and increase blur intensity
      Animated.parallel([
        Animated.timing(expandAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(blurIntensity, {
          toValue: FINAL_BLUR,
          duration: 400,
          useNativeDriver: false,
        })
      ]).start(() => {
        // Mark initial development animation as done
        setInitialAnimationDone(true);
      });
    });
  }

  // Effect to handle final state (success/failure) only after initial animation and VLM result
  useEffect(() => {
    if (initialAnimationDone) {
      if (captureSuccess === true) {
        setIsCompleted(true);
      } else if (captureSuccess === false) { // Explicitly check for false
        // Only run rip animation if capture has definitively failed
        // and not already ripping or minimizing
        if (!isRipping && !isMinimizing) {
          runRipAnimation();
        }
      }
      // If captureSuccess is null, do nothing here. This means identification is still in progress.
      // The UI will show "Identifying..." or the label with loading dots based on other props.
    }
  }, [captureSuccess, initialAnimationDone, isRipping, isMinimizing]);

  // Run minimize animation for when user dismisses
  const runMinimizeAnimation = () => {
    setIsMinimizing(true);

    const centerX = SCREEN_WIDTH / 2 - targetDimensions.width / 2;
    const centerY = SCREEN_HEIGHT / 2 - targetDimensions.height / 2;

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
        onDismiss();
      }
    });
  };

  // Function to manually reject the capture
  const handleReject = () => {
    if (posthog) {
      posthog.capture("capture_rejected", {
        objectType: label || "unknown"
      });
    }
    
    if (!isRipping && !isMinimizing && initialAnimationDone) {
      // Set rejection flag first
      if (onReject) {
        onReject();
      }

      runRipAnimation();
    }
  };

  // Run rip animation for failure case
  const runRipAnimation = () => {
    // Ensure initial state
    leftPieceAnim.setValue({ x: 0, y: 0 });
    rightPieceAnim.setValue({ x: 0, y: 0 });
    leftRotateAnim.setValue(0);
    rightRotateAnim.setValue(0);

    // First, violent shake before ripping
    Animated.sequence([
      // Violent shake
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 0.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -0.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -0.3,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ])
    ]).start(() => {
      setIsRipping(true);

      // Small delay to ensure the torn pieces are visible
      setTimeout(() => {
        // Then rip and fall
        Animated.parallel([
          // Left piece falls to the left and down
          Animated.timing(leftPieceAnim.x, {
            toValue: -150,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(leftPieceAnim.y, {
            toValue: SCREEN_HEIGHT,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(leftRotateAnim, {
            toValue: -0.3,
            duration: 800,
            useNativeDriver: true,
          }),

          // Right piece falls to the right and down
          Animated.timing(rightPieceAnim.x, {
            toValue: 150,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(rightPieceAnim.y, {
            toValue: SCREEN_HEIGHT,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(rightRotateAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // When animation completes, dismiss
          setTimeout(onDismiss, 300);
        });
      }, 50);
    });
  };

  // Handle background press
  const handleBackgroundPress = () => {
    if (posthog) {
      posthog.capture("capture_accepted", {
        objectType: label || "unknown",
        isPublic: isPublic
      });
    }
    if (isCompleted && !isMinimizing) {
      runMinimizeAnimation();
    }
  };

  // Animation styles depending on current state
  const getAnimationStyles = () => {
    // If we're minimizing, use minimize animation values
    if (isMinimizing) {
      return {
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
    }

    // If we're in the development/expansion phase
    if (!isRipping) {
      return getAnimatedStyles(
        captureBox,
        targetDimensions,
        fadeAnim,
        shakeAnim,
        expandAnim
      );
    }

    // If we're ripping, hide the main polaroid
    return {
      opacity: 0,
    };
  };

  // Generate the zigzag path for the tear
  const getZigzagPath = (width: number, height: number) => {
    const zigzagWidth = width * 0.05; // Width of zigzag
    const zigzagCount = 15; // Number of zigzags
    const segmentHeight = height / zigzagCount;

    let path = `M ${width / 2} 0`;

    for (let i = 0; i < zigzagCount; i++) {
      const y = (i + 1) * segmentHeight;
      const direction = i % 2 === 0 ? 1 : -1;
      path += ` L ${width / 2 + (zigzagWidth * direction)} ${y}`;
    }

    return path;
  };

  // Left half styles for ripping animation
  const getLeftPieceStyles = () => {
    if (!isRipping) return { opacity: 0, position: 'absolute' as const };

    return {
      position: 'absolute' as const,
      left: SCREEN_WIDTH / 2 - targetDimensions.width / 2,
      top: SCREEN_HEIGHT / 2 - targetDimensions.height / 2,
      width: targetDimensions.width / 2,
      height: targetDimensions.height,
      backgroundColor: backgroundColor,
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
      overflow: 'hidden' as const,
      transform: [
        { translateX: leftPieceAnim.x },
        { translateY: leftPieceAnim.y },
        {
          rotate: leftRotateAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '-90deg']
          })
        }
      ]
    };
  };

  // Right half styles for ripping animation
  const getRightPieceStyles = () => {
    if (!isRipping) return { opacity: 0, position: 'absolute' as const };

    return {
      position: 'absolute' as const,
      left: SCREEN_WIDTH / 2,
      top: SCREEN_HEIGHT / 2 - targetDimensions.height / 2,
      width: targetDimensions.width / 2,
      height: targetDimensions.height,
      backgroundColor: backgroundColor,
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
      overflow: 'hidden' as const,
      transform: [
        { translateX: rightPieceAnim.x },
        { translateY: rightPieceAnim.y },
        {
          rotate: rightRotateAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '90deg']
          })
        }
      ]
    };
  };

  // Update parent component when isPublic changes
  useEffect(() => {
    if (onSetPublic) {
      onSetPublic(isPublic);
    }
  }, [isPublic, onSetPublic]);

  // Add logging whenever the label is rendered
  useEffect(() => {
    if (captureSuccess === true && label) {
      console.log("==== POLAROID RENDERING LABEL ====");
      console.log("Label being rendered:", label);
    }
  }, [captureSuccess, label]);

  // Handle public/private toggle
  const handlePrivacyToggle = (newIsPublic: boolean) => {
    if (posthog) {
      posthog.capture("privacy_toggled", {
        isPublic: newIsPublic
      });
    }
    setIsPublic(newIsPublic);
    if (onSetPublic) {
      onSetPublic(newIsPublic);
    }
  };

  return (
    <View className="absolute inset-0">
      {/* Blurred background - gets touchable in final state */}
      <TouchableWithoutFeedback onPress={isCompleted ? handleBackgroundPress : undefined}>
        <BlurView
          intensity={blurIntensityRef.current.value}
          tint="light"
          className="absolute inset-0"
        />
      </TouchableWithoutFeedback>

      {/* Main Polaroid frame */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            backgroundColor: backgroundColor,
            borderRadius: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
            width: targetDimensions.width,
            height: targetDimensions.height,
            left: captureBox.x + (captureBox.width / 2) - (targetDimensions.width / 2),
            top: captureBox.y + (captureBox.height / 2) - (targetDimensions.height / 2),
          },
          getAnimationStyles(),
        ]}
      >
        {/* Photo container */}
        <View style={{
          width: targetDimensions.photoWidth,
          height: targetDimensions.photoHeight,
          marginTop: FRAME_EDGE_PADDING,
          marginHorizontal: FRAME_EDGE_PADDING,
          marginBottom: 0,
          overflow: 'hidden'
        }}>
          {/* The photo image */}
          <Image
            source={{ uri: photoUri }}
            style={{
              width: '100%',
              height: '100%'
            }}
            contentFit={isCompleted ? "contain" : "cover"}
          />

          {/* White overlay that fades away */}
          {!isCompleted && !isRipping && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: backgroundColor,
                opacity: fadeAnim,
              }}
            />
          )}
        </View>

        {/* Bottom space with label text */}
        <View className="flex items-center justify-center" style={{ height: FRAME_BOTTOM_PADDING }}>
          {captureSuccess === true && label && (
            <View className="flex-row items-center justify-center">
              <Text className="font-shadows text-black text-center text-3xl">
                {label}
              </Text>

              {/* Show loading dots when we have tier1 result but identification is not yet complete */}
              {!identificationComplete && isIdentifying && (
                <View className="flex-row ml-2 items-center">
                  <Animated.View
                    className="h-2 w-2 rounded-full bg-gray-700 mx-0.5"
                    style={{ opacity: dot1Opacity }}
                  />
                  <Animated.View
                    className="h-2 w-2 rounded-full bg-gray-700 mx-0.5"
                    style={{ opacity: dot2Opacity }}
                  />
                  <Animated.View
                    className="h-2 w-2 rounded-full bg-gray-700 mx-0.5"
                    style={{ opacity: dot3Opacity }}
                  />
                </View>
              )}
            </View>
          )}
          {captureSuccess === null && isIdentifying && (
            <View className="flex-row items-center justify-center space-x-2">
              <Text className="font-shadows text-black text-center text-2xl">
                Identifying
              </Text>
              <View className="flex-row">
                <Animated.View
                  className="h-2 w-2 rounded-full bg-gray-700 mx-0.5"
                  style={{ opacity: dot1Opacity }}
                />
                <Animated.View
                  className="h-2 w-2 rounded-full bg-gray-700 mx-0.5"
                  style={{ opacity: dot2Opacity }}
                />
                <Animated.View
                  className="h-2 w-2 rounded-full bg-gray-700 mx-0.5"
                  style={{ opacity: dot3Opacity }}
                />
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Left half of torn polaroid */}
      <Animated.View style={getLeftPieceStyles()}>
        {/* Left half of photo */}
        <View style={{
          position: 'absolute',
          width: targetDimensions.photoWidth / 2 + FRAME_EDGE_PADDING, // Extend to the right edge
          height: targetDimensions.photoHeight,
          top: FRAME_EDGE_PADDING,
          left: FRAME_EDGE_PADDING,
          overflow: 'hidden',
        }}>
          <Image
            source={{ uri: photoUri }}
            style={{
              width: targetDimensions.photoWidth,
              height: targetDimensions.photoHeight,
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            contentFit="cover"
          />
        </View>

        {/* Bottom space */}
        <View style={{
          position: 'absolute',
          height: FRAME_BOTTOM_PADDING,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: backgroundColor
        }} />

        {/* Zigzag tear - just visual, no content */}
        <View style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 1,
          height: '100%',
          backgroundColor: 'transparent',
        }}>
          <Svg height={targetDimensions.height} width={2}>
            <Path
              d={getZigzagPath(2, targetDimensions.height)}
              fill="none"
              stroke="transparent"
              strokeWidth={1}
            />
          </Svg>
        </View>
      </Animated.View>

      {/* Right half of torn polaroid */}
      <Animated.View style={getRightPieceStyles()}>
        {/* Right half of photo */}
        <View style={{
          position: 'absolute',
          width: targetDimensions.photoWidth / 2 + FRAME_EDGE_PADDING, // Extend to the left edge
          height: targetDimensions.photoHeight,
          top: FRAME_EDGE_PADDING,
          right: FRAME_EDGE_PADDING,
          overflow: 'hidden',
        }}>
          <Image
            source={{ uri: photoUri }}
            style={{
              width: targetDimensions.photoWidth,
              height: targetDimensions.photoHeight,
              position: 'absolute',
              top: 0,
              right: 0,
            }}
            contentFit="cover"
          />
        </View>

        {/* Bottom space */}
        <View style={{
          position: 'absolute',
          height: FRAME_BOTTOM_PADDING,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: backgroundColor
        }} />

        {/* Zigzag tear - just visual, no content */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1,
          height: '100%',
          backgroundColor: 'transparent',
        }}>
          <Svg height={targetDimensions.height} width={2}>
            <Path
              d={getZigzagPath(2, targetDimensions.height)}
              fill="none"
              stroke="transparent"
              strokeWidth={1}
            />
          </Svg>
        </View>
      </Animated.View>

      {/* Control buttons - only show after initial animation is done AND identification is complete */}
      {initialAnimationDone && !isRipping && !isMinimizing && identificationComplete && (
        <View className="absolute bottom-28 left-0 right-0 flex flex-col items-center z-10">
          {/* Reject/Accept buttons */}
          <View className="flex flex-row justify-center items-center">
            {/* Reject button */}
            <TouchableOpacity
              className="bg-background rounded-full w-16 h-16 flex items-center justify-center shadow-lg mr-20"
              onPress={handleReject}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={36} color="red" />
            </TouchableOpacity>

            {/* Accept button */}
            <TouchableOpacity
              className="bg-background rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
              onPress={handleBackgroundPress}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={36} color="green" />
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Public/private toggle button */}
      {initialAnimationDone && captureSuccess && !isRipping && !isMinimizing && (
        <View className="absolute bottom-32 left-0 right-0 items-center">
          <TouchableOpacity
            className="bg-background rounded-full px-4 py-2 flex flex-row items-center shadow-lg"
            onPress={() => handlePrivacyToggle(!isPublic)}
            activeOpacity={0.7}
          >
            <Ionicons name={isPublic ? "ios-globe" : "ios-lock-closed"} size={24} color="black" />
            <Text className="text-lg ml-2">{isPublic ? "Public" : "Private"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Calculate the final dimensions for the polaroid based on aspect ratio
function calculateTargetDimensions(aspectRatio: number) {
  let photoWidth, photoHeight, frameWidth, frameHeight;

  if (aspectRatio >= 1) {
    // Landscape or square image
    photoWidth = POLAROID_MAX_WIDTH - (FRAME_EDGE_PADDING * 2);
    photoHeight = photoWidth / aspectRatio;
    frameWidth = POLAROID_MAX_WIDTH;
    frameHeight = photoHeight + FRAME_EDGE_PADDING + FRAME_BOTTOM_PADDING;

    // Check if frame exceeds max height
    if (frameHeight > MAX_FRAME_HEIGHT) {
      const scale = MAX_FRAME_HEIGHT / frameHeight;
      frameWidth *= scale;
      frameHeight = MAX_FRAME_HEIGHT;
      photoWidth = frameWidth - (FRAME_EDGE_PADDING * 2);
      photoHeight = photoWidth / aspectRatio;
    }
  } else {
    // Portrait image
    const maxPhotoHeight = MAX_FRAME_HEIGHT - FRAME_EDGE_PADDING - FRAME_BOTTOM_PADDING;
    photoHeight = maxPhotoHeight;
    photoWidth = photoHeight * aspectRatio;

    // Check if photo width exceeds max polaroid width
    if (photoWidth + (FRAME_EDGE_PADDING * 2) > POLAROID_MAX_WIDTH) {
      photoWidth = POLAROID_MAX_WIDTH - (FRAME_EDGE_PADDING * 2);
      photoHeight = photoWidth / aspectRatio;
    }

    frameWidth = photoWidth + (FRAME_EDGE_PADDING * 2);
    frameHeight = photoHeight + FRAME_EDGE_PADDING + FRAME_BOTTOM_PADDING;
  }

  return {
    width: frameWidth,
    height: frameHeight,
    photoWidth,
    photoHeight,
  };
}

// Calculate animation transform styles for the development phase
function getAnimatedStyles(
  captureBox: { x: number; y: number; width: number; height: number },
  targetDimensions: { width: number; height: number },
  fadeAnim: Animated.Value,
  shakeAnim: Animated.Value,
  expandAnim: Animated.Value
) {
  // Calculate center of screen for final position
  const centerX = SCREEN_WIDTH / 2 - targetDimensions.width / 2;
  const centerY = SCREEN_HEIGHT / 2 - targetDimensions.height / 2;

  // Calculate initial position (centered on crop)
  const initialX = captureBox.x + (captureBox.width / 2) - (targetDimensions.width / 2);
  const initialY = captureBox.y + (captureBox.height / 2) - (targetDimensions.height / 2);

  // Calculate translation to center of screen
  const translateX = centerX - initialX;
  const translateY = centerY - initialY;

  // Calculate initial scale (from crop size to full size)
  const initialScaleX = captureBox.width / targetDimensions.width;
  const initialScaleY = captureBox.height / targetDimensions.height;

  return {
    transform: [
      // Shaking animation
      {
        rotate: shakeAnim.interpolate({
          inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
          outputRange: ['0deg', '1deg', '-1deg', '1deg', '-1deg', '0deg'],
        }),
      },
      // Scale animation - from crop size to full size
      {
        scaleX: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [initialScaleX, 1],
        }),
      },
      {
        scaleY: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [initialScaleY, 1],
        }),
      },
      // Position animation
      {
        translateX: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, translateX],
        }),
      },
      {
        translateY: expandAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, translateY],
        }),
      },
    ],
  };
}