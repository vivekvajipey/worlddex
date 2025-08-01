import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Collection } from "../../../database/types";
import { useAuth } from "../../../src/contexts/AuthContext";
import { createCollection, updateCollection } from "../../../database/hooks/useCollections";
import { usePhotoUpload } from "../../../src/hooks/usePhotoUpload";
import AddCollectionItemsScreen from "./AddCollectionItemsScreen";
import { usePostHog } from "posthog-react-native";
import { useAlert } from "../../../src/contexts/AlertContext";

interface CreateCollectionScreenProps {
  visible: boolean;
  onClose: () => void;
}

const CreateCollectionScreen: React.FC<CreateCollectionScreenProps> = ({
  visible,
  onClose,
}) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [collection, setCollection] = useState<Collection | null>(null);
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { uploadPhoto, isUploading } = usePhotoUpload();
  const posthog = usePostHog();
  const { showAlert } = useAlert();

  const isProcessing = isLoading || isUploading;

  useEffect(() => {
    // Track screen view only when modal becomes visible
    if (visible && posthog) {
      posthog.screen("Create-Collection");
    }
  }, [visible, posthog]);

  const handleClose = () => {
    // Reset state before closing
    setStep(1);
    setName("");
    setDescription("");
    setCoverImage(null);
    setCoverImageFile(null);
    setCollection(null);
    onClose();
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      showAlert({
        title: "Permission Required",
        message: "You need to grant permission to access your photos",
        icon: "images-outline",
        iconColor: "#F59E0B"
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      setCoverImage(selectedAsset.uri);

      // Create a file object for upload
      const uri = Platform.OS === "ios" ? selectedAsset.uri.replace("file://", "") : selectedAsset.uri;
      const filename = selectedAsset.uri.split("/").pop() || "cover_image.jpg";
      const type = "image/jpeg";

      setCoverImageFile({
        uri,
        name: filename,
        type,
      });
    }
  };

  const handleCreateCollection = async () => {
    if (!name) {
      showAlert({
        title: "Missing Information",
        message: "Please fill all required fields",
        icon: "information-circle-outline",
        iconColor: "#F59E0B"
      });
      return;
    }

    if (userId) {
      try {
        setIsLoading(true);

        // Create the collection first to get the ID
        const newCollection = await createCollection({
          name,
          description,
          created_by: userId,
          is_featured: false,
        });

        if (newCollection) {
          let updatedCollection = newCollection;

          // Upload image to S3 if one is selected
          if (coverImage && coverImageFile) {
            try {
              // Use uploadPhoto to upload the cover image
              const imageKey = await uploadPhoto(
                coverImage,
                coverImageFile.type,
                coverImageFile.name,
                `collections/${newCollection.id}`
              );

              if (imageKey) {
                // Update the collection with the cover image key
                const updated = await updateCollection(newCollection.id, {
                  cover_photo_key: imageKey
                });

                if (updated) {
                  updatedCollection = updated;
                }
              }
            } catch (error) {
              console.error('Failed to upload cover image:', error);
              showAlert({
                title: "Error",
                message: "Failed to upload cover image, but collection was created",
                icon: "alert-circle-outline",
                iconColor: "#EF4444"
              });
            }
          }

          setCollection(updatedCollection);
          setStep(2);
        }
      } catch (error) {
        console.error('Failed to create collection:', error);
        showAlert({
          title: "Error",
          message: "An error occurred while creating the collection",
          icon: "alert-circle-outline",
          iconColor: "#EF4444"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (step === 2 && collection) {
    return (
      <AddCollectionItemsScreen
        visible={visible}
        onClose={handleClose}
        collection={collection}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-4">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-primary justify-center items-center absolute right-4 z-10"
            onPress={handleClose}
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>

          <View className="flex-1 items-center">
            <Text className="text-text-primary font-lexend-bold text-xl">
              Create Collection
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6">
            <Text className="text-text-primary font-lexend-semibold text-lg mb-1">
              Collection Name *
            </Text>
            <TextInput
              className="bg-primary-200 text-black px-4 py-3 rounded-lg font-lexend"
              placeholder="Enter collection name"
              placeholderTextColor="#888"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-6">
            <Text className="text-text-primary font-lexend-semibold text-lg mb-1">
              Description
            </Text>
            <TextInput
              className="bg-primary-200 text-black px-4 py-3 rounded-lg font-lexend"
              placeholder="Enter description (optional)"
              placeholderTextColor="#888"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
              style={{ height: 100 }}
            />
          </View>

          <View className="mb-8">
            <Text className="text-text-primary font-lexend-semibold text-lg mb-2">
              Cover Image
            </Text>

            <TouchableOpacity
              onPress={handlePickImage}
              className="border-2 border-dashed border-gray-600 rounded-lg overflow-hidden"
              style={{ height: 180 }}
            >
              {coverImage ? (
                <Image
                  source={{ uri: coverImage }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={300}
                />
              ) : (
                <View className="flex-1 justify-center items-center">
                  <Image
                    source={require("../../../assets/images/WorldDex Horizontal.png")}
                    style={{ width: '75%', height: '50%', opacity: 0.5 }}
                    contentFit="contain"
                  />
                  <Text className="text-gray-400 mt-2 font-lexend">
                    Tap to select custom cover image
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="bg-primary py-4 rounded-lg items-center justify-center mb-4"
            onPress={handleCreateCollection}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text className="text-white font-lexend-semibold text-lg">
                  Next
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
        
      </SafeAreaView>
    </Modal>
  );
};

export default CreateCollectionScreen;