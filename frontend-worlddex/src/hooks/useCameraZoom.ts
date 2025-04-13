import { useState, useMemo } from "react";
import { Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { useAnimatedProps } from "react-native-reanimated";

export const useCameraZoom = () => {
  const [zoom, setZoom] = useState(0);
  const [lastZoom, setLastZoom] = useState(0);

  const cameraAnimatedProps = useAnimatedProps(() => ({
    zoom: zoom,
  }));

  const pinchGesture = useMemo(
    () => Gesture.Pinch()
      .runOnJS(true)
      .onUpdate((event) => {
        const velocity = event.velocity / 15;
        const outFactor = lastZoom * (Platform.OS === "ios" ? 50 : 25);

        let newZoom =
          velocity > 0
            ? zoom + event.scale * velocity * (Platform.OS === "ios" ? 0.02 : 35)
            : zoom - (event.scale * (outFactor || 1)) * Math.abs(velocity) * (Platform.OS === "ios" ? 0.035 : 60);

        if (newZoom < 0) newZoom = 0;
        else if (newZoom > 0.9) newZoom = 0.9;

        setZoom(newZoom);
      })
      .onEnd(() => {
        setLastZoom(zoom);
      }),
    [zoom, lastZoom]
  );

  return {
    zoom,
    lastZoom,
    cameraAnimatedProps,
    pinchGesture,
  };
};
