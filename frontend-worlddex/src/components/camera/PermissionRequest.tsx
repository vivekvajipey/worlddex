import { Button, Text, View } from "react-native";

interface PermissionRequestProps {
  message: string;
  onRequest: () => void;
}

/**
 * Permission request screen component
 */
export const PermissionRequest = ({ 
  message, 
  onRequest 
}: PermissionRequestProps) => (
  <View className="flex-1 justify-center items-center bg-background">
    <Text className="text-center text-text-primary font-lexend-medium mb-4">
      {message}
    </Text>
    <Button 
      onPress={onRequest} 
      title={`Grant ${message.includes("camera") ? "camera" : "media"} permission`} 
    />
  </View>
);
