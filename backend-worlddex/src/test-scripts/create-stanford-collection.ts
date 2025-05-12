import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../database/supabase-client';
import { Tables } from '../../database/supabase-client';
import { STANFORD_LANDMARKS, STANFORD_COLLECTION } from '../data/stanford-landmarks';

// Admin user ID - REPLACE THIS with your actual admin user ID
const ADMIN_USER_ID = "YOUR_ADMIN_USER_ID";

async function createStanfordCollection() {
  try {
    console.log("Creating Stanford 50 Collection...");
    
    // Check if admin user ID has been set
    if (ADMIN_USER_ID === "YOUR_ADMIN_USER_ID") {
      console.error("ERROR: Please update the ADMIN_USER_ID in the script with your actual admin user ID.");
      process.exit(1);
    }
    
    // 1. Create the collection
    const collectionData = {
      ...STANFORD_COLLECTION,
      created_by: ADMIN_USER_ID,
      is_featured: true
    };
    
    const { data: collection, error: collectionError } = await supabase
      .from(Tables.COLLECTIONS)
      .insert(collectionData)
      .select()
      .single();
      
    if (collectionError) {
      throw new Error(`Failed to create collection: ${collectionError.message}`);
    }
    
    console.log("Collection created:", collection);
    const collectionId = collection.id;
    
    // 2. Create item entries in all_items table first
    console.log("Creating items...");
    
    for (const landmark of STANFORD_LANDMARKS) {
      // Create item
      const itemId = uuidv4();
      const itemData = {
        id: itemId,
        name: landmark.name,
        description: landmark.description,
        global_rarity: landmark.collection_rarity,
        total_captures: 0,
      };
      
      const { error: itemError } = await supabase
        .from(Tables.ALL_ITEMS)
        .insert(itemData);
        
      if (itemError) {
        console.error(`Failed to create item ${landmark.name}: ${itemError.message}`);
        continue;
      }
      
      // Create collection item
      const collectionItemData = {
        collection_id: collectionId,
        item_id: itemId,
        display_name: landmark.name,
        name: landmark.name,
        silhouette_key: landmark.silhouette_key,
        thumb_key: landmark.thumb_key,
        is_secret_rare: landmark.is_secret_rare,
        collection_rarity: landmark.collection_rarity,
        location: landmark.coordinates ? {
          type: "Point",
          coordinates: [landmark.coordinates.lng, landmark.coordinates.lat]
        } : null
      };
      
      const { error: collectionItemError } = await supabase
        .from(Tables.COLLECTION_ITEMS)
        .insert(collectionItemData);
        
      if (collectionItemError) {
        console.error(`Failed to create collection item ${landmark.name}: ${collectionItemError.message}`);
        continue;
      }
      
      console.log(`Created item: ${landmark.name}`);
    }
    
    console.log("\nSummary:");
    console.log(`- Collection ID: ${collectionId}`);
    console.log(`- Collection Name: ${STANFORD_COLLECTION.name}`);
    console.log(`- Created ${STANFORD_LANDMARKS.length} landmarks`);
    console.log("\nStanford 50 collection setup complete!");
    
  } catch (error) {
    console.error("Error creating Stanford collection:", error);
  }
}

// Run the script
createStanfordCollection().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 