const LIFE_WORDS = ["tree","plant","flower","bird","animal","mammal"];
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
  if (collections.includes("Stanford") && gpsInStanford(gps)) {
    console.log("Stanford collection active and GPS in Stanford, using landmark module");
    return { run:true, module:"landmark" };
  }

  // Then check for plant/animal identification
  // Use category information if available
  if (category) {
    // Route plants to the plant identification service
    if (collections.includes("Organisms") && category === "plant") {
      console.log("Organisms collection active and category is plant, using species module");
      return { run:true, module:"species" };
    }
    
    // Route animals to the plant identification service too for now
    // since we've deprecated the species service
    if (collections.includes("Organisms") && category === "animal") {
      console.log("Organisms collection active and category is animal, using species module");
      return { run:true, module:"species" };
    }
    
    console.log(`Category ${category} does not match routing rules`);
  } 
  // Fall back to keyword-based routing if category is not available
  else if (collections.includes("Organisms") && LIFE_WORDS.some(w => tier1Label.toLowerCase().includes(w))) {
    const matchedWord = LIFE_WORDS.find(w => tier1Label.toLowerCase().includes(w));
    console.log(`No category, but keyword match with '${matchedWord}' in label, using species module`);
    return { run:true, module:"species" };
  }

  console.log("No routing rules matched, skipping Tier2");
  return { run:false };
}