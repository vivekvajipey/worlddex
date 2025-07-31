import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
  ScrollView,
  SafeAreaView,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";
import { useUserCaptures, fetchUserCaptures, deleteCapture, updateCapture } from "../../database/hooks/useCaptures";
import { fetchAllCollections } from "../../database/hooks/useCollections";
import { useUserCollectionsList, fetchUserCollectionsByUser } from "../../database/hooks/useUserCollections";
import { Capture, Collection } from "../../database/types";
import { useDownloadUrls } from "../../src/hooks/useDownloadUrls";
import { usePostHog } from "posthog-react-native";
import { useAlert } from "../../src/contexts/AlertContext";
import { OfflineCaptureService } from "../../src/services/offlineCaptureService";
import { CombinedCapture } from "../../src/types/combinedCapture";
import { checkServerConnection } from "../../src/utils/networkUtils";

// Import the extracted components
import WorldDexTab from "../components/captures/WorldDexTab";
import CollectionsTab from "../components/collections/CollectionsTab";
import CaptureDetailsModal from "../components/captures/CaptureDetailsModal";
import CollectionDetailScreen from "../components/collections/CollectionDetailScreen";
import PendingCaptureIdentifier from "../components/captures/PendingCaptureIdentifier";
import DeleteConfirmationModal from "../components/modals/DeleteConfirmationModal";

const { width } = Dimensions.get("window");

export default function PersonalCapturesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("WorldDex");
  const [selectedCapture, setSelectedCapture] = useState<CombinedCapture | null>(null);
  const [captureModalVisible, setCaptureModalVisible] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionDetailVisible, setCollectionDetailVisible] = useState(false);
  const [refreshedCaptures, setRefreshedCaptures] = useState<Capture[]>([]);
  const [userCollectionsData, setUserCollectionsData] = useState<Collection[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingCaptures, setPendingCaptures] = useState<CombinedCapture[]>([]);
  const [selectedPendingCapture, setSelectedPendingCapture] = useState<any>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [captureToDelete, setCaptureToDelete] = useState<Capture | null>(null);
  

  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  // Add a ref to track if we're responding to a tab click
  const isTabClickRef = useRef(false);
  const { session } = useAuth();
  const userId = session?.user?.id || null;

  const { captures, loading: capturesLoading } = useUserCaptures(userId);
  
  // Log when captures are loaded from hook
  useEffect(() => {
    if (!capturesLoading && captures.length > 0) {
      console.log("[CAPTURE FLOW] WorldDex loaded captures from hook", {
        timestamp: new Date().toISOString(),
        captureCount: captures.length,
        latestCapture: captures[0]?.captured_at,
        isUsingCache: true
      });
    }
  }, [capturesLoading, captures]);
  const { userCollections, loading: userCollectionsLoading } = useUserCollectionsList(userId);

  // Fetch pending captures on mount
  const fetchPendingCaptures = useCallback(async () => {
    if (!userId) {
      setPendingCaptures([]);
      return;
    }
    
    try {
      const pending = await OfflineCaptureService.getAllPendingCaptures(userId);
      
      // Filter out pending captures with missing images and clean them up
      const validPending: typeof pending = [];
      for (const p of pending) {
        if (p.imageUri) {
          // Check if this is a file URI and if the file exists
          if (p.imageUri.startsWith('file://')) {
            try {
              const FileSystem = await import('expo-file-system');
              const fileInfo = await FileSystem.getInfoAsync(p.imageUri);
              if (!fileInfo.exists) {
                console.log("[CAPTURE FLOW] Cleaning up pending capture with missing image", {
                  id: p.id,
                  imageUri: p.imageUri
                });
                // Clean up this invalid pending capture
                await OfflineCaptureService.deletePendingCapture(p.id, userId);
                continue; // Skip this capture
              }
            } catch (error) {
              console.error("Error checking file existence:", error);
              // If we can't check, keep it for now
            }
          }
          validPending.push(p);
        }
      }
      
      const combined: CombinedCapture[] = validPending
        .map(p => ({
          id: p.id,
          image_key: '', // Will use imageUri instead
          imageUri: p.imageUri,
          captured_at: p.capturedAt,
          capturedAt: p.capturedAt,
          isPending: p.status !== 'temporary', // Temporary captures are not "pending"
          pendingStatus: p.status,
          pendingError: p.error,
          location: p.location,
          // Add fields for temporary captures
          item_name: p.label,
          rarity_tier: p.rarityTier,
          rarity_score: p.rarityScore,
          _pendingData: p // Store original pending capture data
        }))
        .sort((a, b) => {
          // Sort by capturedAt in descending order (newest first)
          const dateA = new Date(a.capturedAt || 0).getTime();
          const dateB = new Date(b.capturedAt || 0).getTime();
          return dateB - dateA;
        });
      setPendingCaptures(combined);
      
      // Log temporary captures
      // const tempCaptures = combined.filter(c => c.pendingStatus === 'temporary');
      // if (tempCaptures.length > 0) {
      //   console.log("[CAPTURE FLOW] Temporary captures found in WorldDex", {
      //     timestamp: new Date().toISOString(),
      //     count: tempCaptures.length,
      //     captures: tempCaptures.map(c => ({ id: c.id, label: c.item_name }))
      //   });
      // }
    } catch (error) {
      console.error("Failed to fetch pending captures:", error);
    }
  }, []);

  useEffect(() => {
    console.log("[CAPTURE FLOW] WorldDex screen opened", {
      timestamp: new Date().toISOString(),
      cachedCaptureCount: captures.length
    });
    fetchPendingCaptures();
  }, [fetchPendingCaptures, captures.length]);

  // Merge server captures with pending captures
  const combinedCaptures = useMemo(() => {
    const serverCaptures = refreshedCaptures.length > 0 ? refreshedCaptures : captures;
    // Pending captures should appear first (most recent)
    return [...pendingCaptures, ...serverCaptures];
  }, [refreshedCaptures, captures, pendingCaptures]);

  // Collect all image keys for batch loading - use thumb_key with fallback to image_key
  // Skip pending captures as they use local URIs
  const captureImageKeys = useMemo(() => {
    const displayCaptures = refreshedCaptures.length > 0 ? refreshedCaptures : captures;
    return displayCaptures.map(capture => capture.thumb_key || capture.image_key).filter(Boolean) as string[];
  }, [refreshedCaptures, captures]);

  // Fetch all image URLs in one batch
  const { items: imageUrlItems, loading: imageUrlsLoading } = useDownloadUrls(captureImageKeys);

  // Create a map from image keys to download URLs
  // Also include local URIs for pending captures
  const imageUrlMap = useMemo(() => {
    const urlMap = Object.fromEntries(imageUrlItems.map(item => [item.key, item.downloadUrl]));
    
    // Add pending capture URIs to the map
    pendingCaptures.forEach(capture => {
      if (capture.imageUri) {
        urlMap[capture.id] = capture.imageUri; // Use capture ID as key for pending
      }
    });
    
    // Debug log for temporary captures
    const tempCaptures = pendingCaptures.filter(c => c.pendingStatus === 'temporary');
    if (tempCaptures.length > 0) {
      console.log("[CAPTURE FLOW] Image URL mapping for temp captures", {
        timestamp: new Date().toISOString(),
        mappings: tempCaptures.map(c => ({ 
          id: c.id, 
          hasImageUri: !!c.imageUri,
          imageUri: c.imageUri?.substring(0, 50) + '...'
        }))
      });
    }
    
    return urlMap;
  }, [imageUrlItems, pendingCaptures]);

  // Similarly for collections, collect cover photo keys
  const collectionCoverKeys = useMemo(() => {
    return userCollectionsData
      .map(collection => collection.cover_photo_key)
      .filter(Boolean) as string[];
  }, [userCollectionsData]);

  // Fetch all collection cover URLs in one batch
  const { items: coverUrlItems, loading: coverUrlsLoading } = useDownloadUrls(collectionCoverKeys);

  // Create a map from cover keys to download URLs
  const coverUrlMap = useMemo(() => {
    return Object.fromEntries(coverUrlItems.map(item => [item.key, item.downloadUrl]));
  }, [coverUrlItems]);

  // Function to fetch full collection details for user collections
  const fetchUserCollectionDetails = useCallback(async () => {
    if (!userCollections.length) return [];

    try {
      // Get all collections
      const allCollections = await fetchAllCollections(100);

      // Filter to only include collections that the user has added
      const collectionIds = userCollections.map(uc => uc.collection_id);
      return allCollections.filter(collection => collectionIds.includes(collection.id));
    } catch (error) {
      console.error("Error fetching user collection details:", error);
      return [];
    }
  }, [userCollections]);

  // Function to refresh data from Supabase
  const refreshData = useCallback(async (showLoadingIndicator = true) => {
    if (!userId) return;

    console.log("[CAPTURE FLOW] WorldDex manual refresh triggered", {
      timestamp: new Date().toISOString(),
      userId
    });

    if (showLoadingIndicator) {
      setIsRefreshing(true);
    }

    try {
      // Fetch fresh captures data
      const freshCaptures = await fetchUserCaptures(userId, 100);

      // Fetch fresh user collections data
      const userCollectionEntries = await fetchUserCollectionsByUser(userId);
      const allCollections = await fetchAllCollections(100);

      // Filter collections to only those the user has added
      const collectionIds = userCollectionEntries.map(uc => uc.collection_id);
      const userAddedCollections = allCollections.filter(
        collection => collectionIds.includes(collection.id)
      );

      // Update state with the fresh data
      setRefreshedCaptures(freshCaptures);
      setUserCollectionsData(userAddedCollections);
      
      console.log("[CAPTURE FLOW] WorldDex refresh complete", {
        timestamp: new Date().toISOString(),
        freshCaptureCount: freshCaptures.length,
        latestCapture: freshCaptures[0]?.captured_at,
        collectionsCount: userAddedCollections.length
      });
      
      // Also refresh pending captures
      await fetchPendingCaptures();
      
      // Clean up any temporary captures that now exist in the database
      const tempCaptures = pendingCaptures.filter(c => c.pendingStatus === 'temporary');
      if (tempCaptures.length > 0 && freshCaptures.length > 0) {
        for (const temp of tempCaptures) {
          // Check if this temporary capture now exists in the database
          // by matching label and approximate time (within 5 minutes)
          const tempTime = new Date(temp.capturedAt || '').getTime();
          const matchingCapture = freshCaptures.find(c => {
            const captureTime = new Date(c.captured_at || '').getTime();
            const timeDiff = Math.abs(captureTime - tempTime);
            return c.item_name === temp.item_name && timeDiff < 5 * 60 * 1000; // 5 minutes
          });
          
          if (matchingCapture) {
            console.log("[CAPTURE FLOW] Cleaning up temporary capture - now in database", {
              timestamp: new Date().toISOString(),
              tempId: temp.id,
              dbId: matchingCapture.id,
              label: temp.item_name
            });
            try {
              await OfflineCaptureService.deletePendingCapture(temp.id, userId);
            } catch (cleanupError) {
              console.error("Failed to clean up temporary capture:", cleanupError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      if (showLoadingIndicator) {
        setIsRefreshing(false);
      }
    }
  }, [userId, fetchPendingCaptures]);

  // Reset to WorldDex tab and refresh data when screen mounts
  useEffect(() => {
    setActiveTab("WorldDex");
    scrollX.setValue(0);
    // Ensure the scroll view is at position 0
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
    }, 100);

    // Refresh data from Supabase
    refreshData();
  }, [refreshData]);

  // Load user collections when they change
  useEffect(() => {
    const loadCollectionDetails = async () => {
      if (userCollections.length > 0) {
        const collections = await fetchUserCollectionDetails();
        setUserCollectionsData(collections);
      }
    };

    loadCollectionDetails();
  }, [userCollections, fetchUserCollectionDetails]);

  // Initialize refreshed data with hook data
  useEffect(() => {
    if (captures.length > 0 && refreshedCaptures.length === 0) {
      setRefreshedCaptures(captures);
    }
  }, [captures, refreshedCaptures]);

  // Effect to update active tab based on scroll position
  useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      // Skip updating the active tab if we're currently responding to a tab click
      if (isTabClickRef.current) return;

      if (value < width / 2) {
        setActiveTab("WorldDex");
      } else {
        setActiveTab("Collections");
      }
    });

    return () => {
      scrollX.removeListener(listener);
    };
  }, []);

  const handleCapturePress = async (capture: CombinedCapture) => {
    // Check if this is a pending capture that needs identification
    if (capture.isPending && capture.pendingStatus !== 'temporary') {
      // Check server connection first
      const isConnected = await checkServerConnection();
      if (!isConnected) {
        showAlert({
          title: "No Connection",
          message: "Unable to reach the server. Please check your internet connection and try again.",
          icon: "wifi-outline",
          iconColor: "#EF4444"
        });
        return;
      }
      
      // Get the original pending capture data
      const pendingData = (capture as any)._pendingData;
      if (pendingData) {
        setSelectedPendingCapture(pendingData);
      }
      return;
    }
    
    // For temporary captures, show a message and refresh to check if it's saved
    if (capture.pendingStatus === 'temporary') {
      showAlert({
        title: "Saving Capture",
        message: `Your ${capture.item_name} capture is being saved.`,
        icon: "time-outline",
        iconColor: "#3B82F6",
        buttons: [
          {
            text: "Refresh",
            style: "default",
            onPress: () => {
              console.log("[CAPTURE FLOW] User triggered refresh for temporary capture", {
                timestamp: new Date().toISOString(),
                tempId: capture.id,
                label: capture.item_name
              });
              // Refresh data to check if the capture has been saved
              refreshData();
            }
          }
        ]
      });
      return;
    }
    
    setSelectedCapture(capture);
    setCaptureModalVisible(true);
  };

  const handleCollectionPress = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setCollectionDetailVisible(true);
  };

  const handleTabPress = (tab: string) => {
    // Set the flag to indicate we're responding to a tab click
    isTabClickRef.current = true;

    // Don't update the activeTab immediately
    scrollViewRef.current?.scrollTo({
      x: tab === "WorldDex" ? 0 : width,
      animated: true
    });

    // Update activeTab after a delay to match the scroll animation
    setTimeout(() => {
      setActiveTab(tab);

      // Clear the flag after the animation is complete
      setTimeout(() => {
        isTabClickRef.current = false;
      }, 50);
    }, 200); // Most of the scroll animation duration
  };

  const handleCollectionClose = () => {
    setCollectionDetailVisible(false);

    // Use silent refresh to update data without showing loading indicator
    refreshData(false);

    // Keep this timeout to ensure the modal is fully closed before resetting the ID
    setTimeout(() => {
      setSelectedCollectionId(null);
    }, 300);
  };

  const handleCaptureDetailsClose = () => {
    setCaptureModalVisible(false);
    // Clear selected capture after a delay to allow modal animation
    setTimeout(() => {
      setSelectedCapture(null);
    }, 300);
  };

  const handleDeleteCapture = (capture: Capture) => {
    // Show confirmation alert every time
    showAlert({
      title: "Delete Capture",
      message: "Are you sure you want to delete this capture? This action can not be undone.",
      icon: "trash-outline",
      iconColor: "#EF4444",
      buttons: [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDeleteCapture(capture)
        }
      ]
    });
  };

  const performDeleteCapture = (capture: Capture) => {
    if (!capture.id) return;

    // Close the details modal first
    setCaptureModalVisible(false);
    
    // Set the capture to delete and show confirmation modal after a delay
    setTimeout(() => {
      setCaptureToDelete(capture);
      setDeleteModalVisible(true);
    }, 300); // Wait for modal close animation
  };

  const confirmDelete = async () => {
    if (!captureToDelete?.id) return;

    console.log("Attempting to delete capture:", captureToDelete.id);
    console.log("Current user ID:", userId);
    console.log("Capture owner ID:", captureToDelete.user_id);
    
    try {
      const success = await deleteCapture(captureToDelete.id);
      console.log("Delete result:", success);
      if (success) {
        // Update the captures list
        setRefreshedCaptures(prev => prev.filter(c => c.id !== captureToDelete.id));
        
        // Close the delete modal
        setDeleteModalVisible(false);
        setCaptureToDelete(null);
        
        // Show success message
        setTimeout(() => {
          showAlert({
            title: "Success",
            message: "Capture deleted successfully.",
            icon: "checkmark-circle",
            iconColor: "#10B981"
          });
        }, 300);
        
        // Refresh data to ensure consistency
        setTimeout(() => {
          refreshData(false); // Silent refresh without loading indicator
        }, 500);
      } else {
        // If delete returns false, show error
        setDeleteModalVisible(false);
        setCaptureToDelete(null);
        
        setTimeout(() => {
          showAlert({
            title: "Cannot Delete Capture",
            message: "This capture cannot be deleted.",
            icon: "alert-circle-outline",
            iconColor: "#EF4444"
          });
        }, 300);
      }
    } catch (error) {
      console.error("Error deleting capture:", error);
      setDeleteModalVisible(false);
      setCaptureToDelete(null);
      
      setTimeout(() => {
        showAlert({
          title: "Error",
          message: "Failed to delete capture. Please try again.",
          icon: "alert-circle-outline",
          iconColor: "#EF4444"
        });
      }, 300);
    }
  };

  // Handle updating a capture
  const handleUpdateCapture = async (capture: Capture, updates: Partial<Capture>) => {
    if (!capture.id) return;

    try {
      const updatedCapture = await updateCapture(capture.id, updates);
      if (updatedCapture) {
        // Update the captures list with the updated capture
        setRefreshedCaptures(prev =>
          prev.map(c => c.id === updatedCapture.id ? updatedCapture : c)
        );
      }
    } catch (error) {
      console.error("Error updating capture:", error);
      showAlert({
        title: "Error",
        message: "Failed to update capture. Please try again.",
        icon: "alert-circle-outline",
        iconColor: "#EF4444"
      });
    }
  };

  // Create pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50 && activeTab === "WorldDex") {
          handleTabPress("Collections");
        } else if (gestureState.dx > 50 && activeTab === "Collections") {
          handleTabPress("WorldDex");
        }
      },
    })
  ).current;

  // Determine which captures and collections to display
  const displayCaptures = combinedCaptures;
  const displayCollections = userCollectionsData.length > 0 ? userCollectionsData : [];

  const posthog = usePostHog();
  const { showAlert } = useAlert();

  useEffect(() => {
    // Track screen view when component mounts
    if (posthog) {
      posthog.screen("Personal-Captures");
    }
  }, [posthog]);

  return (
    <SafeAreaView className="flex-1 bg-background">
        {/* Header with back button and tabs */}
        <View className="relative">
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-4 top-4 z-10 p-2"
          >
            <Ionicons name="chevron-back" size={28} color="#9CA3AF" />
          </TouchableOpacity>
          
          {/* Header Tabs */}
          <View className="flex-row justify-center pt-4 pb-2">
          <View className="items-center mr-12">
            <TouchableOpacity onPress={() => handleTabPress("WorldDex")}>
              <Text
                className={`text-lg font-lexend-bold ${activeTab === "WorldDex" ? "text-primary" : "text-gray-400"
                  }`}
              >
                WorldDex
              </Text>
            </TouchableOpacity>
            {activeTab === "WorldDex" && (
              <View className="h-[3px] w-12 bg-primary mt-1 rounded-full" />
            )}
          </View>

          <View className="items-center ml-12">
            <TouchableOpacity onPress={() => handleTabPress("Collections")}>
              <Text
                className={`text-lg font-lexend-bold ${activeTab === "Collections" ? "text-primary" : "text-gray-400"
                  }`}
              >
                Collections
              </Text>
            </TouchableOpacity>
            {activeTab === "Collections" && (
              <View className="h-[3px] w-12 bg-primary mt-1 rounded-full" />
            )}
          </View>
        </View>
        </View>

        {/* Scrollable content */}
        <View className="flex-1">
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            {...panResponder.panHandlers}
            className="flex-1"
          >
            {/* WorldDex Tab */}
            <View style={{ width, height: '100%' }}>
              <WorldDexTab
                active={activeTab === "WorldDex"}
                displayCaptures={displayCaptures}
                loading={capturesLoading || isRefreshing}
                urlsLoading={imageUrlsLoading}
                urlMap={imageUrlMap}
                onCapturePress={handleCapturePress}
              />
            </View>

            {/* Collections Tab */}
            <View style={{ width, height: '100%' }}>
              <CollectionsTab
                displayCollections={displayCollections}
                loading={isRefreshing || userCollectionsLoading}
                onCollectionPress={handleCollectionPress}
                refreshCollections={refreshData}
                urlsLoading={coverUrlsLoading}
                urlMap={coverUrlMap}
              />
            </View>
          </Animated.ScrollView>
        </View>


        {/* Capture Details Modal - shown on top of everything else when visible */}
        {captureModalVisible && selectedCapture && (
          <CaptureDetailsModal
            visible={captureModalVisible}
            capture={selectedCapture}
            onClose={handleCaptureDetailsClose}
            onDelete={performDeleteCapture}
            onUpdate={handleUpdateCapture}
            showAlert={showAlert}
          />
        )}

        {/* Collection Detail Screen - slides up over the current screen */}
        {selectedCollectionId && (
          <CollectionDetailScreen
            collectionId={selectedCollectionId}
            onClose={handleCollectionClose}
            visible={collectionDetailVisible}
          />
        )}
        
        {/* Pending Capture Identifier */}
        {selectedPendingCapture && (
          <PendingCaptureIdentifier
            pendingCapture={selectedPendingCapture}
            onClose={() => {
              setSelectedPendingCapture(null);
              refreshData(); // Refresh to update the list
            }}
            onSuccess={() => {
              // Don't need to set null here, onClose will handle it
              // Just refresh data
              refreshData();
            }}
          />
        )}
        
        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          visible={deleteModalVisible}
          itemName={captureToDelete?.item_name || ''}
          imageUrl={captureToDelete ? imageUrlMap[captureToDelete.thumb_key || captureToDelete.image_key] : undefined}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteModalVisible(false);
            setCaptureToDelete(null);
          }}
        />
        
    </SafeAreaView>
  );
}