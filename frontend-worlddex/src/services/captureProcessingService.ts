import type { Capture, CollectionItem } from '../../database/types';
import { OfflineCaptureService } from './offlineCaptureService';

// Define interfaces for the service
export interface ProcessCaptureParams {
  // Capture data
  userId: string;
  identifiedLabel: string;
  capturedUri: string;
  isCapturePublic: boolean;
  rarityTier: "common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary";
  rarityScore?: number;
  location?: { latitude: number; longitude: number };
  tier1Response?: any; // For XP value
  
  // Service dependencies (injected to avoid circular deps)
  services: {
    incrementOrCreateItem: (label: string) => Promise<{ item: any; isGlobalFirst: boolean }>;
    uploadCapturePhoto: (uri: string, type: string, filename: string, payload: any) => Promise<any>;
    incrementCaptureCount: () => Promise<void>;
    fetchUserCollectionsByUser: (userId: string) => Promise<any[]>;
    fetchCollectionItems: (collectionId: string) => Promise<any[]>;
    checkUserHasCollectionItem: (userId: string, itemId: string) => Promise<boolean>;
    createUserCollectionItem: (data: any) => Promise<any>;
  };
  
  // Optional: Save as temporary capture for immediate display
  enableTemporaryCapture?: boolean;
  
  // Optional callbacks
  onProgress?: (status: string) => void;
}

export interface ProcessCaptureResult {
  success: boolean;
  captureRecord?: any;
  error?: string;
  isGlobalFirst?: boolean;
  xpAwarded?: number;
  coinsAwarded?: number;
}

// Helper function for updating user collections
async function updateUserCollections(
  userId: string,
  identifiedLabel: string,
  captureId: string,
  services: ProcessCaptureParams['services']
) {
  try {
    const userCollections = await services.fetchUserCollectionsByUser(userId);
    console.log(`[CAPTURE] Found ${userCollections.length} user collections to check`);

    for (const userCollection of userCollections) {
      const collectionItems = await services.fetchCollectionItems(userCollection.collection_id);
      
      // Filter items that match the identified label
      const matchingItems = collectionItems.filter((ci: CollectionItem) => {
        const itemNameMatch = ci.name?.toLowerCase() === identifiedLabel.toLowerCase();
        const displayNameMatch = ci.display_name?.toLowerCase() === identifiedLabel.toLowerCase();
        return itemNameMatch || displayNameMatch;
      });

      console.log(`[CAPTURE] Found ${matchingItems.length} matching items in collection ${userCollection.collection_id}`);

      // Add matching items to user's collection
      for (const collectionItem of matchingItems) {
        try {
          const hasItem = await services.checkUserHasCollectionItem(userId, collectionItem.id);
          
          if (!hasItem) {
            await services.createUserCollectionItem({
              user_id: userId,
              collection_item_id: collectionItem.id,
              capture_id: captureId,
              collection_id: collectionItem.collection_id,
            });
            console.log(`[CAPTURE] Added ${identifiedLabel} to collection ${collectionItem.collection_id}`);
          }
        } catch (collectionErr) {
          console.error('[CAPTURE] Error adding item to user collection:', collectionErr);
          // Continue with next item even if this one fails
        }
      }
    }
  } catch (collectionErr) {
    console.error('[CAPTURE] Error handling collections:', collectionErr);
    // Non-critical error, continue
  }
}

// Main service function for processing captures after identification
export async function processCaptureAfterIdentification(
  params: ProcessCaptureParams
): Promise<ProcessCaptureResult> {
  const { 
    userId, 
    identifiedLabel, 
    capturedUri,
    isCapturePublic,
    rarityTier,
    rarityScore,
    tier1Response,
    services,
    enableTemporaryCapture,
    onProgress
  } = params;
  
  let temporaryCaptureId: string | null = null;
  
  try {
    // 0. Save as temporary capture for immediate display (if enabled)
    if (enableTemporaryCapture) {
      try {
        onProgress?.('Saving temporary capture...');
        const tempCapture = await OfflineCaptureService.saveTemporaryCapture({
          imageUri: capturedUri,
          capturedAt: new Date().toISOString(),
          label: identifiedLabel,
          rarityTier,
          rarityScore
        }, userId);
        temporaryCaptureId = tempCapture.id;
        // console.log("[CAPTURE] Temporary capture saved for immediate display:", temporaryCaptureId);
      } catch (tempError) {
        // Non-critical - continue without temporary capture
        console.error("[CAPTURE] Failed to save temporary capture:", tempError);
      }
    }
    // 1. Create or increment item
    onProgress?.('Creating item record...');
    // console.log("[CAPTURE] Getting/creating item for label:", identifiedLabel);
    const { item, isGlobalFirst } = await services.incrementOrCreateItem(identifiedLabel);
    
    if (!item) {
      console.error("[CAPTURE] Failed to create or increment item for label:", identifiedLabel);
      throw new Error(`Failed to create or increment item for label: ${identifiedLabel}`);
    }

    // 2. Create capture payload
    const capturePayload: Omit<Capture, "id" | "captured_at" | "segmented_image_key" | "thumb_key"> = {
      user_id: userId,
      item_id: item.id,
      item_name: item.name,
      capture_number: item.total_captures,
      image_key: "", // This will be set by uploadCapturePhoto
      is_public: isCapturePublic,
      like_count: 0,
      daily_upvotes: 0,
      rarity_tier: rarityTier,
      rarity_score: rarityScore
      // Note: Omitting location due to PostGIS issues mentioned in code
    };

    // 3. Upload photo and create capture record
    onProgress?.('Uploading capture...');
    // console.log("[CAPTURE] Uploading photo and creating capture record");
    const captureRecord = await services.uploadCapturePhoto(
      capturedUri,
      "image/jpeg",
      `${Date.now()}.jpg`,
      capturePayload
    );

    if (!captureRecord) {
      console.error("[CAPTURE] Failed to create capture record");
      throw new Error('Failed to create capture record');
    }

    // 4. Handle collections
    onProgress?.('Updating collections...');
    // console.log("[CAPTURE] Checking if capture matches any collection items...");
    await updateUserCollections(
      userId,
      identifiedLabel,
      captureRecord.id,
      services
    );

    // 5. Increment user stats
    console.log('[CAPTURE] Incrementing user stats');
    await services.incrementCaptureCount();
    console.log('[CAPTURE] Incremented capture count');

    // console.log("[CAPTURE] Successfully saved to database");
    
    // 6. Clean up temporary capture after successful DB save
    if (temporaryCaptureId) {
      try {
        await OfflineCaptureService.deletePendingCapture(temporaryCaptureId, userId);
        console.log("[CAPTURE] Cleaned up temporary capture:", temporaryCaptureId);
      } catch (cleanupError) {
        // Non-critical - temporary will be cleaned up by WorldDex
        console.error("[CAPTURE] Failed to clean up temporary capture:", cleanupError);
      }
    }
    
    return {
      success: true,
      captureRecord,
      isGlobalFirst,
      xpAwarded: tier1Response?.xpValue
    };
    
  } catch (error) {
    console.error('[CAPTURE] Error processing capture:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}