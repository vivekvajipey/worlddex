import { View, Text, Pressable } from 'react-native';
import { usePhotoUpload } from '../hooks/usePhotoUpload';

// This is a tiny 1x1 transparent pixel in base64
const TEST_BASE64_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

export function TestPhotoUpload() {
  const { uploadPhoto, isUploading, error } = usePhotoUpload();

  const handleTestUpload = async () => {
    try {
      const result = await uploadPhoto({
        base64Data: TEST_BASE64_IMAGE,
        fileName: 'test.png',
        contentType: 'image/png'
      });
      
      console.log('Upload successful:', result);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <View className="p-4">
      <Pressable 
        onPress={handleTestUpload}
        className="bg-blue-500 p-4 rounded-lg"
      >
        <Text className="text-white text-center">
          {isUploading ? 'Uploading...' : 'Test Photo Upload'}
        </Text>
      </Pressable>

      {error && (
        <Text className="text-red-500 mt-4">
          {error.message}
        </Text>
      )}
    </View>
  );
} 