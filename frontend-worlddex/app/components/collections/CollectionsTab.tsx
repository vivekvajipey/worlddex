import React, { useState, useRef, useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Animated, Dimensions } from "react-native";
import { Collection } from "../../../database/types";
import CollectionThumbnail from "./CollectionThumbnail";
import { Ionicons } from "@expo/vector-icons";
import AllCollectionsScreen from "./AllCollectionsScreen";
import CreateCollectionScreen from "./CreateCollectionScreen";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";

interface CollectionsTabProps {
  displayCollections: Collection[];
  loading: boolean;
  urlsLoading?: boolean;
  urlMap?: Record<string, string>;
  onCollectionPress: (collectionId: string) => void;
  refreshCollections?: () => void;
}

const CollectionsTab: React.FC<CollectionsTabProps> = ({
  displayCollections,
  loading,
  urlsLoading = false,
  urlMap = {},
  onCollectionPress,
  refreshCollections
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [allCollectionsVisible, setAllCollectionsVisible] = useState(false);
  const [createCollectionVisible, setCreateCollectionVisible] = useState(false);
  const isFocused = useIsFocused();

  useFocusEffect(
    React.useCallback(() => {
      if (refreshCollections) {
        refreshCollections();
      }
    }, [refreshCollections])
  );

  // Additional effect to refresh when modals close
  const handleCloseAllCollections = () => {
    setAllCollectionsVisible(false);
    if (refreshCollections) {
      refreshCollections();
    }
  };

  const handleCloseCreateCollection = () => {
    setCreateCollectionVisible(false);
    if (refreshCollections) {
      refreshCollections();
    }
  };

  // Refresh when collection is pressed (as this will affect the collection detail view)
  const handleCollectionPress = (collectionId: string) => {
    onCollectionPress(collectionId);
    // After user returns from collection detail view, refresh the collection list
    if (refreshCollections) {
      setTimeout(() => {
        refreshCollections();
      }, 300); // Small delay to ensure the data has time to update
    }
  };

  // Sort collections: featured first, then alphabetically
  const sortedCollections = [...displayCollections].sort((a, b) => {
    // First by featured status (featured items first)
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;

    // Then alphabetically by name
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (!displayCollections.length) {
    return (
      <View className="flex-1 justify-center items-center p-4">
        <Text className="text-text-primary font-lexend-medium">No added collections yet.</Text>

        <FABGroup />
        <AllCollectionsScreen
          visible={allCollectionsVisible}
          onClose={handleCloseAllCollections}
          onCollectionPress={onCollectionPress}
        />
        <CreateCollectionScreen
          visible={createCollectionVisible}
          onClose={handleCloseCreateCollection}
        />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlatList
        data={sortedCollections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="relative">
            <CollectionThumbnail
              collection={item}
              onPress={() => handleCollectionPress(item.id)}
            />
            {item.is_featured && (
              <View className="absolute right-6 top-4 bg-orange-500 px-2 py-1 rounded-full">
                <Text className="text-white text-xs font-lexend-medium">
                  Featured
                </Text>
              </View>
            )}
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: 80 }}
        style={{ width: "100%", flex: 1 }}
      />

      <FABGroup />
      <AllCollectionsScreen
        visible={allCollectionsVisible}
        onClose={handleCloseAllCollections}
        onCollectionPress={onCollectionPress}
      />
      <CreateCollectionScreen
        visible={createCollectionVisible}
        onClose={handleCloseCreateCollection}
      />
    </View>
  );

  function FABGroup() {
    // Animation values
    const searchButtonAnim = useRef(new Animated.Value(0)).current;
    const editButtonAnim = useRef(new Animated.Value(0)).current;
    const mainButtonRotation = useRef(new Animated.Value(0)).current;

    // Keep track of animation completion
    const animatingRef = useRef(false);

    // Toggle expanded state
    const toggleExpand = () => {
      // Prevent toggling during active animation
      if (animatingRef.current) return;

      animatingRef.current = true;

      if (!isExpanded) {
        expandButtons();
        setIsExpanded(true);
      } else {
        collapseButtons();
        return;
      }
    };

    const expandButtons = () => {
      Animated.parallel([
        // Rotate main button from + to x
        Animated.timing(mainButtonRotation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        // Stagger the appearance of action buttons
        Animated.stagger(100, [
          Animated.spring(searchButtonAnim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(editButtonAnim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          })
        ])
      ]).start(() => {
        animatingRef.current = false;
      });
    };

    // Handle collapsing animation
    const collapseButtons = () => {
      Animated.parallel([
        // Rotate main button from x to +
        Animated.timing(mainButtonRotation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        // Hide the buttons in reverse order
        Animated.stagger(50, [
          Animated.spring(editButtonAnim, {
            toValue: 0,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(searchButtonAnim, {
            toValue: 0,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          })
        ])
      ]).start(() => {
        animatingRef.current = false;
        setIsExpanded(false);
      });
    };

    // Handle animations when expanded state changes
    useEffect(() => {
      // We only need to handle the expanding animation here
      // since collapsing is handled by the toggleExpand function
      if (isExpanded) {
        expandButtons();
      }
    }, [isExpanded]);

    const searchButtonStyle = {
      transform: [
        {
          translateY: searchButtonAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -80]
          })
        },
        {
          scale: searchButtonAnim.interpolate({
            inputRange: [0, 0.8, 1],
            outputRange: [0.3, 0.8, 1]
          })
        }
      ],
      opacity: searchButtonAnim.interpolate({
        inputRange: [0, 0.1, 1],
        outputRange: [0, 1, 1]
      })
    };

    const editButtonStyle = {
      transform: [
        {
          translateY: editButtonAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -160]
          })
        },
        {
          scale: editButtonAnim.interpolate({
            inputRange: [0, 0.8, 1],
            outputRange: [0.3, 0.8, 1]
          })
        }
      ],
      opacity: editButtonAnim.interpolate({
        inputRange: [0, 0.1, 1],
        outputRange: [0, 1, 1]
      })
    };

    // Rotation animation for the main button (45 degrees)
    const mainButtonStyle = {
      transform: [
        {
          rotate: mainButtonRotation.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '45deg'] // From + to X with 45 degree rotation
          })
        }
      ]
    };

    // Background color transition for main button
    const mainButtonBgColor = mainButtonRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgb(249, 115, 22)', 'rgb(31, 41, 55)']
    });

    const mainButtonBgStyle = {
      backgroundColor: mainButtonBgColor
    };

    return (
      <View style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        height: 250,
        width: 64,
        alignItems: 'center'
      }}>
        {/* Search Button */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99,
            },
            searchButtonStyle
          ]}
        >
          <TouchableOpacity
            className="w-16 h-16 rounded-full bg-orange-500 justify-center items-center shadow-lg"
            onPress={() => {
              // Open the all collections screen
              setAllCollectionsVisible(true);
              toggleExpand();
            }}
          >
            <Ionicons name="search" size={30} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Edit Button */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 98,
            },
            editButtonStyle
          ]}
        >
          <TouchableOpacity
            className="w-16 h-16 rounded-full bg-orange-500 justify-center items-center shadow-lg"
            onPress={() => {
              // Open the create collection screen
              setCreateCollectionVisible(true);
              toggleExpand();
            }}
          >
            <Ionicons name="pencil" size={30} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Main FAB */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          zIndex: 100
        }}>
          <TouchableOpacity
            onPress={toggleExpand}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[
                {
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: 3,
                  },
                  shadowOpacity: 0.27,
                  shadowRadius: 4.65,
                  elevation: 6,
                },
                mainButtonBgStyle
              ]}
            >
              <Animated.View style={mainButtonStyle}>
                <Ionicons name="add" size={30} color="#FFF" />
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
};

export default CollectionsTab;