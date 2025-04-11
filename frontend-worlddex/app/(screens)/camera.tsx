import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef, useCallback, useMemo } from "react";
import { Button, Text, TouchableOpacity, View, StyleSheet, Platform, Dimensions } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useAnimatedProps } from "react-native-reanimated";
import { useRouter } from "expo-router";
import Svg, { Path, Polygon } from "react-native-svg";
import * as ImageManipulator from "expo-image-manipulator";

const AnimatedCamera = Animated.createAnimatedComponent(CameraView);
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  // Zoom state
  const [zoom, setZoom] = useState(0);
  const [lastZoom, setLastZoom] = useState(0);

  // Lasso state
  const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pathString, setPathString] = useState("");
  const [polygonPoints, setPolygonPoints] = useState("");

  const cameraAnimatedProps = useAnimatedProps(() => {
    return { zoom };
  });

  // Function to update the path string based on points
  const updatePathString = useCallback((pts: { x: number, y: number }[]) => {
    if (pts.length === 0) return "";

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${pts[i].x} ${pts[i].y}`;
    }

    return path;
  }, []);

  // Function to update polygon points for filling
  const updatePolygonPoints = useCallback((pts: { x: number, y: number }[]) => {
    if (pts.length === 0) return "";

    return pts.map(pt => `${pt.x},${pt.y}`).join(" ");
  }, []);

  // Function to capture the area inside the lasso
  const captureSelectedArea = useCallback(async () => {
    if (!cameraRef.current || points.length < 3) return;

    try {
      // First take a picture of the entire view
      const photo = await cameraRef.current.takePictureAsync({ quality: 1, skipProcessing: false });

      if (!photo) {
        throw new Error("Failed to capture photo");
      }

      // Calculate the image scale factor (photo dimensions vs screen dimensions)
      const scaleX = photo.width / SCREEN_WIDTH;
      const scaleY = photo.height / SCREEN_HEIGHT;

      // Calculate bounding box of the selection, scaling coordinates to match the photo
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (const point of points) {
        // Scale screen coordinates to photo coordinates
        const scaledX = point.x * scaleX;
        const scaledY = point.y * scaleY;

        minX = Math.min(minX, scaledX);
        minY = Math.min(minY, scaledY);
        maxX = Math.max(maxX, scaledX);
        maxY = Math.max(maxY, scaledY);
      }

      // Add padding
      const padding = 10;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(photo.width, maxX + padding);
      maxY = Math.min(photo.height, maxY + padding);

      // Calculate crop dimensions
      const cropWidth = maxX - minX;
      const cropHeight = maxY - minY;

      // Ensure we have a valid crop area
      if (cropWidth <= 10 || cropHeight <= 10) {
        throw new Error("Selection area too small");
      }

      console.log("Cropping with dimensions:", {
        originX: minX,
        originY: minY,
        width: cropWidth,
        height: cropHeight,
        originalWidth: photo.width,
        originalHeight: photo.height
      });

      // Crop the image
      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          {
            crop: {
              originX: minX,
              originY: minY,
              width: cropWidth,
              height: cropHeight,
            },
          },
        ],
        { compress: 0.95 }
      );

      // Save cropped image
      await MediaLibrary.saveToLibraryAsync(manipResult.uri);
      console.log("Cropped photo saved to library:", manipResult.uri);

      // Reset points and path
      setPoints([]);
      setPathString("");
      setPolygonPoints("");

      // Navigate to the photo preview
      router.push({
        pathname: "/(screens)/photo-preview",
        params: { photoUri: manipResult.uri }
      });
    } catch (error) {
      console.error("Error capturing selected area:", error);
      // Reset on error
      setPoints([]);
      setPathString("");
      setPolygonPoints("");
    }
  }, [points, router]);

  // Pan gesture for lasso drawing
  const panGesture = useMemo(
    () => Gesture.Pan()
      .runOnJS(true)
      .minPointers(1)
      .maxPointers(1)  // Ensure only single finger triggers this
      .onStart((event) => {
        setIsDrawing(true);
        const newPoint = { x: event.x, y: event.y };
        setPoints([newPoint]);
        setPathString(`M ${newPoint.x} ${newPoint.y}`);
      })
      .onUpdate((event) => {
        if (!isDrawing) return;

        const newPoint = { x: event.x, y: event.y };
        setPoints(current => {
          const updated = [...current, newPoint];
          setPathString(updatePathString(updated));
          return updated;
        });
      })
      .onEnd(() => {
        if (points.length > 2) {
          // Close the path
          const closedPoints = [...points, points[0]];
          setPathString(updatePathString(closedPoints));
          setPolygonPoints(updatePolygonPoints(closedPoints));

          // Capture the area
          captureSelectedArea();
        } else {
          // Not enough points to form an area
          setPoints([]);
          setPathString("");
          setPolygonPoints("");
        }
        setIsDrawing(false);
      }),
    [isDrawing, points, updatePathString, updatePolygonPoints, captureSelectedArea]
  );

  // Pinch gesture for zoom
  const pinchGesture = useMemo(
    () => Gesture.Pinch()
      .runOnJS(true)
      .onUpdate((event: { velocity: number; scale: number }) => {
        // Prevent drawing while zooming
        if (isDrawing) {
          setIsDrawing(false);
          setPoints([]);
          setPathString("");
        }

        const velocity = event.velocity / 15;
        const outFactor = lastZoom * (Platform.OS === 'ios' ? 50 : 25);

        let newZoom =
          velocity > 0
            ? zoom + event.scale * velocity * (Platform.OS === 'ios' ? 0.02 : 35)
            : zoom - (event.scale * (outFactor || 1)) * Math.abs(velocity) * (Platform.OS === 'ios' ? 0.035 : 60);

        if (newZoom < 0) newZoom = 0;
        else if (newZoom > 0.9) newZoom = 0.9;

        setZoom(newZoom);
      })
      .onEnd(() => {
        setLastZoom(zoom);
      }),
    [zoom, lastZoom, isDrawing]
  );

  // Let the gestures compete to handle the touch
  const gestures = Gesture.Race(
    panGesture,
    pinchGesture
  );

  if (!permission || !mediaPermission) {
    // Camera or media permissions are still loading
    return <View className="flex-1 bg-background" />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Text className="text-center text-text-primary font-lexend-medium mb-4">
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="Grant camera permission" />
      </View>
    );
  }

  if (!mediaPermission.granted) {
    // Media library permissions are not granted yet
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Text className="text-center text-text-primary font-lexend-medium mb-4">
          We need your permission to save photos
        </Text>
        <Button onPress={requestMediaPermission} title="Grant media permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing(current => (current === "back" ? "front" : "back"));
  }

  return (
    <View className="absolute inset-0">
      <GestureDetector gesture={gestures}>
        <Animated.View className="absolute inset-0">
          <AnimatedCamera
            ref={cameraRef}
            className="absolute inset-0"
            facing={facing}
            animatedProps={cameraAnimatedProps}
          >
            {/* SVG overlay for drawing lasso */}
            <Svg width="100%" height="100%" className="absolute inset-0">
              {/* Filled polygon area */}
              {polygonPoints ? (
                <Polygon
                  points={polygonPoints}
                  fill="rgba(255, 244, 237, 0.2)"
                  stroke="none"
                />
              ) : null}

              {/* Lasso path */}
              {pathString ? (
                <Path
                  d={pathString}
                  stroke="#FFF4ED"
                  strokeWidth={3}
                  fill="none"
                />
              ) : null}
            </Svg>

            {/* Flip camera button - top right */}
            <TouchableOpacity
              className="absolute top-20 right-6 bg-background rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10"
              onPress={toggleCameraFacing}
            >
              <Ionicons name="sync-outline" size={22} color="black" />
            </TouchableOpacity>

            {/* Instructions text */}
            <View className="absolute bottom-12 left-0 right-0 items-center">
              <Text className="text-white text-center font-lexend-medium px-6 py-2 bg-black/50 rounded-full">
                Draw with one finger to select an area
              </Text>
            </View>
          </AnimatedCamera>
        </Animated.View>
      </GestureDetector>
    </View>
  );
} 