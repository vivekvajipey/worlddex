import React, { useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { View, Text, TouchableOpacity, Dimensions, Platform } from "react-native";
import { CameraView, CameraType } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import AnimatedReanimated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Path, Polygon } from "react-native-svg";
import { backgroundColor } from "../../utils/colors";

const AnimatedCamera = AnimatedReanimated.createAnimatedComponent(CameraView);
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface CameraCaptureHandle {
  resetLasso: () => void;
  getCameraRef: () => React.RefObject<CameraView>;
}

interface CameraCaptureProps {
  onCapture: (points: { x: number; y: number }[], cameraRef: React.RefObject<CameraView>) => void;
  isCapturing: boolean;
}

const CameraCapture = forwardRef<CameraCaptureHandle, CameraCaptureProps>(
  ({ onCapture, isCapturing }, ref) => {
    const [facing, setFacing] = useState<CameraType>("back");
    const cameraRef = useRef<CameraView>(null);

    // Zoom state
    const [zoom, setZoom] = useState(0);
    const [lastZoom, setLastZoom] = useState(0);

    // Lasso state
    const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
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

    // Method to reset lasso after capture
    const resetLasso = useCallback(() => {
      setPoints([]);
      setPathString("");
      setPolygonPoints("");
    }, []);

    // Method to get the camera ref
    const getCameraRef = useCallback(() => {
      return cameraRef;
    }, []);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      resetLasso,
      getCameraRef
    }));

    // Pan gesture for lasso drawing
    const panGesture = useMemo(
      () => Gesture.Pan()
        .runOnJS(true)
        .minPointers(1)
        .maxPointers(1)  // Ensure only single finger triggers this
        .onStart((event) => {
          if (isCapturing) return;

          setIsDrawing(true);
          const newPoint = { x: event.x, y: event.y };
          setPoints([newPoint]);
          setPathString(`M ${newPoint.x} ${newPoint.y}`);
        })
        .onUpdate((event) => {
          if (!isDrawing || isCapturing) return;

          const newPoint = { x: event.x, y: event.y };
          setPoints(current => {
            const updated = [...current, newPoint];
            setPathString(updatePathString(updated));
            return updated;
          });
        })
        .onEnd(() => {
          if (isCapturing) return;

          if (points.length > 2) {
            // Close the path
            const closedPoints = [...points, points[0]];
            setPathString(updatePathString(closedPoints));
            setPolygonPoints(updatePolygonPoints(closedPoints));

            // Trigger capture with the points
            onCapture(points, cameraRef);

            // Reset will be handled by parent after capture processing
          } else {
            // Not enough points to form an area
            setPoints([]);
            setPathString("");
            setPolygonPoints("");
          }
          setIsDrawing(false);
        }),
      [isDrawing, points, updatePathString, updatePolygonPoints, onCapture, isCapturing]
    );

    // Pinch gesture for zoom
    const pinchGesture = useMemo(
      () => Gesture.Pinch()
        .runOnJS(true)
        .onUpdate((event: { velocity: number; scale: number }) => {
          if (isCapturing) return;

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
          if (isCapturing) return;
          setLastZoom(zoom);
        }),
      [zoom, lastZoom, isDrawing, isCapturing]
    );

    // Let the gestures compete to handle the touch
    const gestures = Gesture.Race(
      panGesture,
      pinchGesture
    );

    // Toggle camera facing
    function toggleCameraFacing() {
      setFacing(current => (current === "back" ? "front" : "back"));
    }

    return (
      <GestureDetector gesture={gestures}>
        <View className="flex-1">
          <AnimatedCamera
            ref={cameraRef}
            className="flex-1"
            facing={facing}
            animatedProps={cameraAnimatedProps}
          >
            {/* SVG overlay for drawing lasso */}
            <Svg width="100%" height="100%" className="absolute inset-0">
              {/* Filled polygon area */}
              {polygonPoints && !isCapturing ? (
                <Polygon
                  points={polygonPoints}
                  fill={`${backgroundColor}33`}
                  stroke="none"
                />
              ) : null}

              {/* Lasso path */}
              {pathString && !isCapturing ? (
                <Path
                  d={pathString}
                  stroke={backgroundColor}
                  strokeWidth={3}
                  strokeDasharray="6,4"
                  fill="none"
                />
              ) : null}
            </Svg>

            {/* Flip camera button - top right */}
            {!isCapturing && (
              <TouchableOpacity
                className="absolute top-20 right-6 bg-background rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10"
                onPress={toggleCameraFacing}
              >
                <Ionicons name="sync-outline" size={22} color="black" />
              </TouchableOpacity>
            )}

            {/* Instructions text */}
            {!isCapturing && (
              <View className="absolute bottom-12 left-0 right-0 items-center">
                <Text className="text-white text-center font-lexend-medium px-6 py-2 bg-black/50 rounded-full">
                  Draw with one finger to select an area
                </Text>
              </View>
            )}
          </AnimatedCamera>
        </View>
      </GestureDetector>
    );
  }
);

CameraCapture.displayName = 'CameraCapture';

export default CameraCapture; 