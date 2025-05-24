import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Collection, CollectionItem, AllItem, Capture } from "../../../database/types";
import { fetchAllItems, fetchItem } from "../../../database/hooks/useItems";
import { createCollectionItem } from "../../../database/hooks/useCollectionItems";
import { fetchUserCaptures } from "../../../database/hooks/useCaptures";
import { addCollectionToUser } from "../../../database/hooks/useUserCollections";
import { createUserCollectionItem } from "../../../database/hooks/useUserCollectionItems";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useDownloadUrl } from "../../../src/hooks/useDownloadUrl";
import { usePhotoUpload } from "../../../src/hooks/usePhotoUpload";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { v4 as uuidv4 } from "uuid";

interface AddCollectionItemsScreenProps {
  visible: boolean;
  onClose: () => void;
  collection: Collection;
}

type Tab = "existing" | "new";

type NewItemFormData = {
  name: string;
  silhouetteImage: string | null;
  silhouetteImageFile: any;
  isSecretRare: boolean;
};

// Create a CaptureListItem component to use the useDownloadUrl hook
const CaptureListItem = ({ capture, isSelected, onPress }: {
  capture: Capture,
  isSelected: boolean,
  onPress: () => void
}) => {
  const { downloadUrl, loading } = useDownloadUrl(capture.image_key);

  return (
    <TouchableOpacity
      className={`flex-row items-center p-3 mb-2 rounded-lg ${isSelected ? "bg-primary bg-opacity-20" : "bg-gray-800"
        }`}
      onPress={onPress}
    >
      {loading ? (
        <View className="w-16 h-16 bg-gray-700 rounded-md mr-3 justify-center items-center">
          <ActivityIndicator size="small" color="#FFF" />
        </View>
      ) : (
        <Image
          source={{ uri: downloadUrl || undefined }}
          className="w-16 h-16 rounded-md mr-3"
          contentFit="cover"
        />
      )}
      <View className="flex-1">
        <Text className="text-white font-lexend-medium">{capture.item_name}</Text>
        <Text className="text-gray-400 text-sm">Capture #{capture.capture_number}</Text>
      </View>
    </TouchableOpacity>
  );
};

const AddCollectionItemsScreen: React.FC<AddCollectionItemsScreenProps> = ({
  visible,
  onClose,
  collection,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [userCaptures, setUserCaptures] = useState<Capture[]>([]);
  const [filteredCaptures, setFilteredCaptures] = useState<Capture[]>([]);
  const [loadingCaptures, setLoadingCaptures] = useState(true);
  const [selectedCaptures, setSelectedCaptures] = useState<string[]>([]);
  const [addedItems, setAddedItems] = useState<CollectionItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { uploadPhoto, isUploading } = usePhotoUpload();
  const navigation = useNavigation();

  // Form state for creating new item
  const [newItemForm, setNewItemForm] = useState<NewItemFormData>({
    name: "",
    silhouetteImage: null,
    silhouetteImageFile: null,
    isSecretRare: false,
  });

  // Load user's captures when the component mounts
  useEffect(() => {
    if (userId) {
      loadUserCaptures();
    }
  }, [userId]);

  // Filter captures based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCaptures(userCaptures);
    } else {
      const loweredQuery = searchQuery.toLowerCase();
      const filtered = userCaptures.filter(capture =>
        capture.item_name.toLowerCase().includes(loweredQuery)
      );
      setFilteredCaptures(filtered);
    }
  }, [searchQuery, userCaptures]);

  const loadUserCaptures = async () => {
    if (!userId) return;

    setLoadingCaptures(true);
    try {
      const captures = await fetchUserCaptures(userId, 100);
      setUserCaptures(captures);
      setFilteredCaptures(captures);
    } catch (error) {
      console.error("Error loading user captures:", error);
      Alert.alert("Error", "Failed to load captures");
    } finally {
      setLoadingCaptures(false);
    }
  };

  const handleSelectCapture = (captureId: string) => {
    setSelectedCaptures(prev => {
      if (prev.includes(captureId)) {
        return prev.filter(id => id !== captureId);
      } else {
        return [...prev, captureId];
      }
    });
  };

  const handleAddSelectedCaptures = async () => {
    if (selectedCaptures.length === 0) {
      Alert.alert("No Captures Selected", "Please select at least one capture");
      return;
    }

    if (!userId) {
      Alert.alert("Error", "You must be logged in to add captures");
      return;
    }

    setIsSubmitting(true);

    try {
      const newCollectionItems: CollectionItem[] = [];

      for (const captureId of selectedCaptures) {
        // Find the capture object
        const capture = userCaptures.find(cap => cap.id === captureId);
        if (!capture) continue;

        // Create collection item using the capture's image_key as silhouette_key
        const newItem = await createCollectionItem({
          collection_id: collection.id,
          item_id: capture.item_id,
          silhouette_key: capture.image_key, // Use the capture's image as the silhouette
          is_secret_rare: false,
          display_name: capture.item_name, // Use item_name as display_name
          name: capture.item_name, // Store the original item name
          thumb_key: capture.thumb_key, // Use the capture's thumb_key if available
        });

        if (newItem) {
          newCollectionItems.push(newItem);
          
          // Automatically mark this item as collected by the user since they're using their own capture
          try {
            await createUserCollectionItem({
              user_id: userId,
              collection_item_id: newItem.id,
              capture_id: captureId,
              collection_id: collection.id,
            });
            console.log(`Automatically marked item ${newItem.id} as collected for user ${userId}`);
          } catch (collectionErr) {
            console.error("Error marking item as collected:", collectionErr);
            // Don't fail the whole operation if this fails
          }
        }
      }

      // Update state with newly added items
      setAddedItems(prev => [...prev, ...newCollectionItems]);

      // Clear selection
      setSelectedCaptures([]);

      Alert.alert("Success", `Added ${newCollectionItems.length} items to the collection and marked them as collected`);
    } catch (error) {
      console.error("Error adding captures to collection:", error);
      Alert.alert("Error", "Failed to add captures to the collection");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickSilhouette = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to grant permission to access your photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];

      // Create a file object for upload
      const uri = Platform.OS === "ios" ? selectedAsset.uri.replace("file://", "") : selectedAsset.uri;
      const filename = selectedAsset.uri.split("/").pop() || "silhouette.jpg";
      const type = "image/jpeg";

      // First set the image URI for immediate display
      const updatedForm = {
        ...newItemForm,
        silhouetteImage: selectedAsset.uri,
        silhouetteImageFile: {
          uri,
          name: filename,
          type,
        }
      };

      setNewItemForm(updatedForm);
    }
  };

  const handleResetNewItemForm = () => {
    setNewItemForm({
      name: "",
      silhouetteImage: null,
      silhouetteImageFile: null,
      isSecretRare: false,
    });
  };

  const handleCreateNewItem = async () => {
    if (!newItemForm.name.trim()) {
      Alert.alert("Missing Information", "Please enter an item name");
      return;
    }
    if (!newItemForm.silhouetteImageFile) {
      Alert.alert("Missing Image", "Please select a silhouette image");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1) generate a unique itemId
      const itemId = uuidv4();

      // 2) prepare upload params
      const { uri: fileUri, name: fileName, type: contentType } = newItemForm.silhouetteImageFile;
      const folder = `collection_items/${userId || "anonymous"}/${collection.id}`;

      // 3) upload the full-size silhouette image
      const silhouetteKey = await uploadPhoto(
        fileUri,
        contentType,
        fileName,
        folder
      );

      // 4) generate a small thumbnail on the device
      const thumbnailResult = await ImageManipulator.manipulateAsync(
        fileUri,
        [{ resize: { width: 200 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );

      // 5) give your thumb a distinct filename
      const thumbFileName = `${itemId}-thumb.jpg`;

      // 6) upload the thumbnail into the same folder under /thumbs
      const thumbKey = await uploadPhoto(
        thumbnailResult.uri,
        "image/jpeg",
        thumbFileName,
        `${folder}/thumbs`
      );

      // 7) finally, create the collection item record with both keys
      const newCollectionItem = await createCollectionItem({
        collection_id: collection.id,
        item_id: itemId,
        silhouette_key: silhouetteKey,
        thumb_key: thumbKey,
        is_secret_rare: newItemForm.isSecretRare,
        display_name: newItemForm.isSecretRare ? "???" : newItemForm.name.trim(),
        name: newItemForm.name.trim(),
      });

      if (newCollectionItem) {
        setAddedItems(prev => [...prev, newCollectionItem]);
        handleResetNewItemForm();
      } else {
        Alert.alert("Error", "Failed to add item to the collection");
      }
    } catch (error) {
      console.error("Error creating new item:", error);
      Alert.alert("Error", "An error occurred while creating the item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    if (!userId) {
      Alert.alert("Error", "You must be logged in to create collections");
      return;
    }

    setIsSubmitting(true);

    try {
      // First add the collection to the user's personal collections
      const result = await addCollectionToUser(userId, collection.id);

      if (!result) {
        Alert.alert("Error", "Failed to add collection to your personal list");
        setIsSubmitting(false);
        return;
      }

      // Simply close the modal and return to the previous screen
      // The useFocusEffect in CollectionsTab will handle the refresh
      onClose();

    } catch (error) {
      console.error("Error adding collection to user's personal list:", error);
      setIsSubmitting(false);
      Alert.alert("Error", "An error occurred. Please try again.");
    }
  };

  // Update the isSubmitting check to include isUploading
  const isProcessing = isSubmitting || isUploading;

  const renderExistingCapturesTab = () => (
    <View className="flex-1">
      <View className="mb-4">
        <TextInput
          className="bg-primary-200 text-black px-4 py-3 rounded-lg font-lexend"
          placeholder="Search your captures..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loadingCaptures ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      ) : (
        <FlatList
          data={filteredCaptures}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CaptureListItem
              capture={item}
              isSelected={selectedCaptures.includes(item.id)}
              onPress={() => handleSelectCapture(item.id)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={() => (
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-text-primary font-lexend-medium">No captures found</Text>
            </View>
          )}
        />
      )}

      <View className="absolute bottom-4 left-0 right-0 px-4">
        <TouchableOpacity
          className="bg-primary py-4 rounded-lg items-center justify-center"
          onPress={handleAddSelectedCaptures}
          disabled={selectedCaptures.length === 0 || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text className="text-white font-lexend-semibold text-lg">
              Add Selected Captures ({selectedCaptures.length})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNewItemTab = () => (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-4">
        <Text className="text-text-primary font-lexend-semibold text-lg mb-1">
          Item Name *
        </Text>
        <TextInput
          className="bg-primary-200 text-black px-4 py-3 rounded-lg font-lexend"
          placeholder="Enter item name"
          placeholderTextColor="#888"
          value={newItemForm.name}
          onChangeText={(text) => setNewItemForm({ ...newItemForm, name: text })}
        />
        {newItemForm.isSecretRare && (
          <Text className="text-gray-400 mt-1 italic">
            Note: This item will be displayed as "???" since it's marked as Secret Rare
          </Text>
        )}
      </View>

      <View className="mb-4 flex-row items-center">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => setNewItemForm({ ...newItemForm, isSecretRare: !newItemForm.isSecretRare })}
        >
          <View
            className={`w-6 h-6 rounded mr-2 justify-center items-center ${newItemForm.isSecretRare ? "bg-primary" : "bg-gray-800"
              }`}
          >
            {newItemForm.isSecretRare && <Ionicons name="checkmark" size={18} color="#FFF" />}
          </View>
          <Text className="text-text-primary font-lexend-medium">Secret Rare</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-6">
        <Text className="text-text-primary font-lexend-semibold text-lg mb-2">
          Silhouette Image *
        </Text>

        <TouchableOpacity
          onPress={handlePickSilhouette}
          className="border-2 border-dashed border-gray-600 rounded-lg overflow-hidden"
          style={{ height: 180 }}
        >
          {newItemForm.silhouetteImage ? (
            <Image
              source={{ uri: newItemForm.silhouetteImage }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <View className="flex-1 justify-center items-center">
              <Ionicons name="image-outline" size={40} color="#888" />
              <Text className="text-gray-400 mt-2 font-lexend">
                Tap to select silhouette image
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-row">
        <TouchableOpacity
          className="bg-gray-700 py-4 rounded-lg items-center justify-center flex-1 mr-2"
          onPress={handleResetNewItemForm}
          disabled={isProcessing}
        >
          <Text className="text-white font-lexend-medium">Reset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-primary py-4 rounded-lg items-center justify-center flex-1 ml-2"
          onPress={handleCreateNewItem}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text className="text-white font-lexend-semibold">Add Item</Text>
          )}
        </TouchableOpacity>
      </View>

      {addedItems.length > 0 && (
        <View className="mt-8">
          <Text className="text-text-primary font-lexend-bold text-xl mb-4">
            Added Items ({addedItems.length})
          </Text>

          {addedItems.map((item, index) => (
            <View
              key={item.id || index}
              className="bg-gray-800 p-3 rounded-lg mb-2"
            >
              <Text className="text-white font-lexend-medium">
                {item.is_secret_rare ?
                  `${item.display_name} (Original: ${item.name})` :
                  item.display_name}
              </Text>
              <Text className="text-gray-400 text-sm">
                {item.is_secret_rare ? "Secret Rare" : "Collection Item"}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-4 py-4">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-primary justify-center items-center absolute left-4 z-10"
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <View className="flex-1 items-center">
            <Text className="text-text-primary font-lexend-bold text-xl">
              Add Collection Items
            </Text>
          </View>

          {/* Green checkmark in the top right */}
          {addedItems.length > 0 && (
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-secondary justify-center items-center absolute right-4 z-10"
              onPress={handleFinish}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons name="checkmark" size={24} color="#FFF" />
              )}
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row border-b border-gray-700 px-4 mb-4">
          <TouchableOpacity
            className={`flex-1 py-3 items-center ${activeTab === "existing" ? "border-b-2 border-primary" : ""
              }`}
            onPress={() => setActiveTab("existing")}
          >
            <Text
              className={`font-lexend-medium ${activeTab === "existing" ? "text-primary" : "text-gray-400"
                }`}
            >
              Existing Captures
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-3 items-center ${activeTab === "new" ? "border-b-2 border-primary" : ""
              }`}
            onPress={() => setActiveTab("new")}
          >
            <Text
              className={`font-lexend-medium ${activeTab === "new" ? "text-primary" : "text-gray-400"
                }`}
            >
              New Item
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 px-4">
          {activeTab === "existing" ? renderExistingCapturesTab() : renderNewItemTab()}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default AddCollectionItemsScreen; 