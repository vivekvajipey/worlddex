const LIFE_WORDS = ["tree","plant","flower","bird","animal","mammal"];

// Collection UUIDs
const COLLECTION_IDS = {
  STANFORD: "07c2674e-cbb4-4e5a-aeb4-cac8d628effa",
  PLANTS: "369c098c-e86c-4409-ac26-d3aac9d75c22",
  TEST: "a800df8e-c8da-4b9e-93c4-44098abce6c7"
};

// Helper function to calculate distance between two GPS coordinates in miles using Haversine formula
function calculateDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in miles
}

export function gpsInStanford(gps?: {lat:number;lng:number}|null) {
  if (!gps) return false;
  return gps.lat > 37.41 && gps.lat < 37.44 && gps.lng < -122.15 && gps.lng > -122.18;
}

export function decideTier2(
  tier1Label: string | null,
  collections: string[] = [],
  gps?: { lat:number; lng:number } | null,
  category?: string | null,
  subcategory?: string | null
) {
  console.log(`Decision inputs - Label: "${tier1Label}", Category: ${category}, Collections: [${collections.join(',')}], GPS: ${gps ? JSON.stringify(gps) : 'null'}`);
  
  if (!tier1Label) {
    console.log("No tier1Label provided, skipping Tier2");
    return { run:false };
  }

  // Stanford landmark identification takes priority over plant/animal identification
  // If GPS is within Stanford and Stanford collection is active, use landmark module
  if (collections.includes(COLLECTION_IDS.STANFORD) && gpsInStanford(gps)) {
    console.log("Stanford collection active and GPS in Stanford, using landmark module");
    return { run:true, module:"landmark" };
  }

  // Then check for plant/animal identification
  // Use category information if available
  if (category) {
    // Route plants to the plant identification service
    if (collections.includes(COLLECTION_IDS.PLANTS) && category === "plant") {
      console.log("Plants collection active and category is plant, using plants module");
      return { run:true, module:"species" };
    }
    
    // Route animals to the plant identification service too for now
    // since we've deprecated the species service
    if (collections.includes(COLLECTION_IDS.PLANTS) && category === "animal") {
      console.log("Plants collection active and category is animal, using plants module");
      return { run:true, module:"species" };
    }
    
    console.log(`Category ${category} does not match routing rules`);
  } 
  // Fall back to keyword-based routing if category is not available
  else if (collections.includes(COLLECTION_IDS.PLANTS) && LIFE_WORDS.some(w => tier1Label.toLowerCase().includes(w))) {
    const matchedWord = LIFE_WORDS.find(w => tier1Label.toLowerCase().includes(w));
    console.log(`No category, but keyword match with '${matchedWord}' in label, using plants module`);
    return { run:true, module:"species" };
  }

  if (collections.includes(COLLECTION_IDS.TEST) && 
      tier1Label && tier1Label.toLowerCase().includes("bottle")) {
    console.log("Test collection active and bottle detected");
    
    // Check if GPS location is within ~100 miles of specified coordinates
    if (gps) {
      const targetLat = 37.432953961860534;
      const targetLng = -122.184734535784;
      const distance = calculateDistanceMiles(
        gps.lat, 
        gps.lng, 
        targetLat, 
        targetLng
      );
      
      console.log(`Distance from target coordinates: ${distance.toFixed(2)} miles`);
      
      if (distance <= 100) {
        console.log("Location is within 100 miles of target coordinates");
      } else {
        console.log("Location is outside 100 miles of target coordinates");
      }
    } else {
      console.log("No GPS coordinates provided for location check");
    }
    
    return { run: false }; // Just use tier1 result for test items
  }

  console.log("No routing rules matched, skipping Tier2");
  return { run:false };
}