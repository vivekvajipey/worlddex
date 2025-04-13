import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CameraControlsProps {
  onFlip: () => void;
  onCapture: () => void;
  disabled: boolean;
}

/**
 * Camera controls component for flip and capture buttons
 */
export const CameraControls = ({ 
  onFlip, 
  onCapture, 
  disabled 
}: CameraControlsProps) => {
  return (
    <>
      {/* Flip camera button - top right */}
      <TouchableOpacity
        className="absolute top-12 right-6"
        onPress={onFlip}
      >
        <Ionicons name="sync-outline" size={28} color="#FFF4ED" />
      </TouchableOpacity>

      {/* Capture button - bottom center */}
      <View className="absolute bottom-12 left-0 right-0 flex items-center">
        <TouchableOpacity
          className="w-20 h-20 rounded-full border-4 border-background justify-center items-center"
          style={{
            opacity: disabled ? 0.7 : 1,
          }}
          onPress={onCapture}
          disabled={disabled}
        >
          <View className="w-16 h-16 bg-white/80 rounded-full" />
        </TouchableOpacity>
      </View>
    </>
  );
};
