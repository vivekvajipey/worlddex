// Categories that should trigger specialized identification
const PLANT_CATEGORIES = ["plant", "tree", "flower"];
const ANIMAL_CATEGORIES = ["bird", "dog", "cat", "animal", "pet", "wildlife", "mammal", "reptile", "amphibian", "fish"];

// Fallback keywords for cases where category isn't available

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
  gps?: { lat:number; lng:number } | null,
  category?: string | null,
  subcategory?: string | null
) {
  console.log(`Decision inputs - Label: "${tier1Label}", Category: ${category}, GPS: ${gps ? JSON.stringify(gps) : 'null'}`);
  
  if (!tier1Label) {
    console.log("No tier1Label provided, skipping Tier2");
    return { run:false };
  }

  // Stanford landmark identification takes priority based on location
  if (gpsInStanford(gps)) {
    console.log("GPS location is within Stanford, using stanford module");
    return { run:true, module:"stanford" };
  }

  // Check for animal identification based on category
  if (category) {
    if (ANIMAL_CATEGORIES.includes(category.toLowerCase())) {
      console.log(`Category '${category}' matches animal criteria, using animals module`);
      return { run:true, module:"animals" };
    }
    
    // Route plants to the plant identification service
    if (PLANT_CATEGORIES.includes(category.toLowerCase())) {
      console.log(`Category '${category}' matches plant criteria, using plants module`);
      return { run:true, module:"plants" };
    }
    
    console.log(`Category ${category} does not match routing rules`);
  } 
  // Fall back to keyword-based routing if category is not available
  else if (tier1Label) {
    if (ANIMAL_CATEGORIES.some(w => tier1Label.toLowerCase().includes(w))) {
      const matchedWord = ANIMAL_CATEGORIES.find(w => tier1Label.toLowerCase().includes(w));
      console.log(`No category, but keyword match with '${matchedWord}' in label, using animals module`);
      return { run:true, module:"animals" };
    } 
    else if (PLANT_CATEGORIES.some(w => tier1Label.toLowerCase().includes(w))) {
      const matchedWord = PLANT_CATEGORIES.find(w => tier1Label.toLowerCase().includes(w));
      console.log(`No category, but keyword match with '${matchedWord}' in label, using plants module`);
      return { run:true, module:"plants" };
    }
  }

  // Special case for bottles (for testing purposes)
  if (tier1Label && tier1Label.toLowerCase().includes("bottle")) {
    console.log("Bottle detected in tier1 label");
    
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
  }

  console.log("No routing rules matched, skipping Tier2");
  return { run:false };
}