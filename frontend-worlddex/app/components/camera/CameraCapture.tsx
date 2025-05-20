import React, { useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle, useEffect } from "react";
import { View, Text, TouchableOpacity, Dimensions, Platform } from "react-native";
import { CameraView, CameraType } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import AnimatedReanimated, { useAnimatedProps } from "react-native-reanimated";
import Svg, { Path, Polygon } from "react-native-svg";
import { backgroundColor } from "../../../src/utils/colors";
import { usePostHog } from "posthog-react-native";

const AnimatedCamera = AnimatedReanimated.createAnimatedComponent(CameraView);
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface CameraCaptureHandle {
  resetLasso: () => void;
  getCameraRef: () => React.RefObject<CameraView>;
}

interface CameraCaptureProps {
  onCapture: (points: { x: number; y: number }[], cameraRef: React.RefObject<CameraView>) => void;
  isCapturing: boolean;
  onFullScreenCapture?: () => void;
}

const CameraCapture = forwardRef<CameraCaptureHandle, CameraCaptureProps>(
  ({ onCapture, isCapturing, onFullScreenCapture }, ref) => {
    const [facing, setFacing] = useState<CameraType>("back");
    const [torchEnabled, setTorchEnabled] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const posthog = usePostHog();

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
          // Update points first
          const updated = [...points, newPoint];
          setPoints(updated);
          // Then update path string separately - not inside a state updater callback
          setPathString(updatePathString(updated));
        })
        .onEnd(() => {
          if (isCapturing) return;

          // Stop drawing immediately to prevent further updates
          setIsDrawing(false);

          if (points.length > 2) {
            // Create a local copy of points to avoid race conditions
            const pointsCopy = [...points];
            const closedPoints = [...pointsCopy, pointsCopy[0]];
            
            // Track lasso capture event
            if (posthog) {
              posthog.capture("capture_lasso", {
                num_points: pointsCopy.length,
                camera_facing: facing,
                torch_enabled: torchEnabled
              });
            }

            setPathString(updatePathString(closedPoints));
            setPolygonPoints(updatePolygonPoints(closedPoints));

            // Capture using the point copy
            // Note: We don't reset state here - the parent will do it 
            // and our UI elements stay mounted regardless
            onCapture(pointsCopy, cameraRef);
          } else {
            // Not enough points to form an area
            setPoints([]);
            setPathString("");
            setPolygonPoints("");
          }
        }),
      [isDrawing, points, updatePathString, updatePolygonPoints, onCapture, isCapturing, posthog, facing, torchEnabled]
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

    // Method to capture full screen photo
    const captureFullScreen = useCallback(() => {
      if (isCapturing || !onFullScreenCapture) return;

      // Track the full screen capture event
      if (posthog) {
        posthog.capture("capture_fullscreen", {
          camera_facing: facing,
          torch_enabled: torchEnabled
        });
      }

      // Trigger full screen capture
      onFullScreenCapture();
    }, [isCapturing, onFullScreenCapture, posthog, facing, torchEnabled]);

    // Double tap gesture for full screen capture
    const doubleTapGesture = useMemo(
      () => Gesture.Tap()
        .runOnJS(true)
        .numberOfTaps(2)
        .onEnd(() => {
          if (isCapturing) return;

          // Clear any in-progress lasso
          if (isDrawing || points.length > 0) {
            setIsDrawing(false);
            setPoints([]);
            setPathString("");
            setPolygonPoints("");
          }

          captureFullScreen();
        }),
      [isCapturing, isDrawing, points.length, captureFullScreen]
    );

    // Let the gestures compete to handle the touch
    const gestures = Gesture.Race(
      panGesture,
      pinchGesture,
      doubleTapGesture
    );

    // Toggle camera facing
    function toggleCameraFacing() {
      const newFacing = facing === "back" ? "front" : "back";
      setFacing(newFacing);
      
      // Track camera flip event
      if (posthog) {
        posthog.capture("toggle_camera_facing", {
          new_facing: newFacing
        });
      }
    }

    // Toggle flashlight/torch
    function toggleTorch() {
      const newTorchState = !torchEnabled;
      setTorchEnabled(newTorchState);
      
      // Track torch toggle event
      if (posthog) {
        posthog.capture("toggle_torch", {
          enabled: newTorchState
        });
      }
    }

    return (
      <View className="flex-1">
        <GestureDetector gesture={gestures}>
          <AnimatedCamera
            ref={cameraRef}
            className="flex-1"
            facing={facing}
            animatedProps={cameraAnimatedProps}
            animateShutter={true}
            enableTorch={torchEnabled}
          >
            {/* Avoiding any conditional rendering that could cause view hierarchy changes */}
            {/* Instead using empty/transparent SVG elements that are always present */}
            <Svg
              width="100%"
              height="100%"
              className="absolute inset-0"
              key="lasso-svg-container"
            >
              {/* Always render the polygon but with empty or real points */}
              <Polygon
                key="lasso-polygon"
                points={isCapturing ? "0,0" : (polygonPoints || "0,0")}
                fill={isCapturing || !polygonPoints ? "transparent" : `${backgroundColor}33`}
                stroke="none"
              />

              {/* Always render the path but with empty or real path data */}
              <Path
                key="lasso-path"
                d={isCapturing ? "M0,0" : (pathString || "M0,0")}
                stroke={isCapturing || !pathString ? "transparent" : backgroundColor}
                strokeWidth={3}
                strokeDasharray="6,4"
                fill="none"
              />
            </Svg>
          </AnimatedCamera>
        </GestureDetector>

        {/* Camera controls - only show when not capturing */}
        {!isCapturing && (
          <>
            {/* Flip camera button - top right */}
            <TouchableOpacity
              className="absolute top-20 right-6 bg-background rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10"
              onPress={toggleCameraFacing}
              activeOpacity={0.7}
            >
              <Ionicons name="sync-outline" size={22} color="black" />
            </TouchableOpacity>

            {/* Flashlight/torch toggle button - top right, below flip button */}
            <TouchableOpacity
              className="absolute top-36 right-6 bg-background rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10"
              onPress={toggleTorch}
              activeOpacity={0.7}
            >
              <Ionicons
                name={torchEnabled ? "flashlight" : "flashlight-outline"}
                size={22}
                color="black"
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }
);

CameraCapture.displayName = 'CameraCapture';

export default CameraCapture;