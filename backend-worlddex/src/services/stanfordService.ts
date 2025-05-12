import { OpenAI } from "openai";
import { Tier2Result } from "../../../shared/types/identify";
import { calculateDistance } from "../utils/geoUtils";
import { STANFORD_LANDMARKS, StanfordLandmark } from "../data/stanford-landmarks";

// Get API key - with logging to help debug
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("StanfordService - OpenAI API Key available:", OPENAI_API_KEY ? "Yes" : "No");
if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY env variable not set - this will cause errors when identifying landmarks");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Get landmarks that are near the user's current location with distance information
 * @param gps User's GPS coordinates
 * @returns Array of landmarks within their defined radii of the user, with distance information
 */
function getNearbyLandmarksWithDistance(gps?: { lat: number; lng: number } | null): Array<StanfordLandmark & { distanceMeters?: number, distanceMiles?: number }> {
  if (!gps) {
    // Without GPS, consider all landmarks (useful for testing)
    return STANFORD_LANDMARKS;
  }
  
  console.log(`Finding landmarks near coordinates: ${gps.lat}, ${gps.lng}`);
  
  // Calculate distance to each landmark and filter by radius
  const landmarksWithDistance = STANFORD_LANDMARKS.map(landmark => {
    // Calculate distance in kilometers
    const distanceKm = calculateDistance(
      gps.lat, 
      gps.lng, 
      landmark.coordinates.lat, 
      landmark.coordinates.lng
    );
    
    // Convert to meters and miles
    const distanceMeters = distanceKm * 1000;
    const distanceMiles = distanceKm * 0.621371;
    
    const radiusKm = landmark.radius / 1000; // Convert landmark radius from meters to km
    console.log(`Landmark: ${landmark.name}, Distance: ${distanceKm.toFixed(3)}km, Radius: ${radiusKm.toFixed(3)}km`);
    
    return {
      ...landmark,
      distanceMeters,
      distanceMiles
    };
  });
  
  // For testing purposes, use a much larger radius (1km) to ensure we get some matches
  // In production, this would be the actual radius from the landmark data
  const TEST_MODE = true;
  const TEST_RADIUS_KM = 1; // 1 kilometer radius for testing
  
  const nearbyLandmarks = landmarksWithDistance.filter(landmark => {
    if (TEST_MODE) {
      // In test mode, use a fixed radius for all landmarks
      const isInRange = (landmark.distanceMeters! / 1000) <= TEST_RADIUS_KM;
      console.log(`Landmark: ${landmark.name}, In Range: ${isInRange}`);
      return isInRange;
    } else {
      // In production, use the landmark's actual radius
      const isInRange = landmark.distanceMeters! <= landmark.radius;
      console.log(`Landmark: ${landmark.name}, In Range: ${isInRange}`);
      return isInRange;
    }
  });
  
  console.log(`Found ${nearbyLandmarks.length} landmarks in range`);
  return nearbyLandmarks;
}

// Build name lookup map for exact matching
const landmarkNameToId: Record<string, string> = {};
const landmarkIdToName: Record<string, string> = {};

// Initialize the lookup maps
for (const landmark of STANFORD_LANDMARKS) {
  landmarkNameToId[landmark.name.toLowerCase()] = landmark.id;
  landmarkIdToName[landmark.id.toLowerCase()] = landmark.name;
  
  // Add special cases for known mismatches
  if (landmark.id === "claw-fountain") {
    landmarkNameToId["the claw"] = "claw-fountain";
    landmarkNameToId["white memorial fountain"] = "claw-fountain";
    landmarkNameToId["the claw (white memorial fountain)"] = "claw-fountain";
  }
  if (landmark.id === "dish-turkey") {
    landmarkNameToId["dish trail turkeys"] = "dish-turkey";
    landmarkNameToId["wild turkeys"] = "dish-turkey";
  }
  if (landmark.id === "rodin-sculptures") {
    landmarkNameToId["rodin sculpture garden"] = "rodin-sculptures";
    landmarkNameToId["rodin garden"] = "rodin-sculptures";
  }
  if (landmark.id === "stone-sphere" || landmark.id === "engineering-quad-planets") {
    // Both IDs map to the same landmark name now
    landmarkNameToId["stone sphere fountain"] = "stone-sphere";
    landmarkNameToId["floating sphere"] = "stone-sphere";
    landmarkNameToId["granite sphere"] = "stone-sphere";
    landmarkNameToId["engineering quad planets"] = "engineering-quad-planets";
    landmarkNameToId["stone spheres"] = "stone-sphere"; // Primary name maps to stone-sphere
  }
  if (landmark.id === "lake-lag") {
    landmarkNameToId["lake lagunita"] = "lake-lag";
    landmarkNameToId["lake lag"] = "lake-lag";
  }
}

/**
 * Identify a Stanford landmark from a photo
 */
export async function identifyLandmark(base64Data: string, gps?: { lat: number; lng: number } | null): Promise<Tier2Result> {
  const nearbyLandmarks = getNearbyLandmarksWithDistance(gps);
  
  if (nearbyLandmarks.length === 0) {
    console.log("No nearby landmarks found");
    return {
      label: null,
      provider: "Stanford GPS+VLM",
      confidence: 0
    };
  }
  
  // Sort landmarks by distance if GPS is available
  if (gps) {
    nearbyLandmarks.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
  }
  
  console.log("Stanford landmarks being considered:", nearbyLandmarks.map(l => l.name + (l.distanceMeters ? ` (${Math.round(l.distanceMeters)}m away)` : "")));
  
  try {
    // Prepare landmark list with distance information when available
    const landmarkListText = nearbyLandmarks.map(l => {
      if (l.distanceMeters !== undefined) {
        return `"${l.name}" (approximately ${Math.round(l.distanceMeters)}m / ${l.distanceMiles!.toFixed(2)} miles from your location)`;
      }
      return `"${l.name}"`;
    }).join(", ");
    
    // Call OpenAI Vision API to identify the landmark
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert Stanford University landmark identifier. Given an image, identify which Stanford landmark it shows. Respond with ONLY the exact name of the landmark from the provided list, nothing else."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Which Stanford landmark is shown in this image? Choose ONLY from this list: ${landmarkListText}. 
              
${gps ? "Consider both the visual features AND the distance information provided to make your decision. If two landmarks look similar, the one closer to the user's current location is more likely to be correct." : ""}

Respond with only the exact name of the landmark, nothing else. Do not include any explanations or descriptions.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`
              }
            }
          ]
        }
      ],
      max_tokens: 50
    });
    
    const identifiedName = response.choices[0].message.content?.trim() || "";
    console.log("Stanford landmark identification response:", identifiedName);
    
    // Find the landmark by name (case-insensitive)
    const identifiedNameLower = identifiedName.toLowerCase();
    let landmarkId: string | undefined = landmarkNameToId[identifiedNameLower];
    
    // If no exact match found, try to find the most similar landmark name
    if (!landmarkId) {
      // Look for partial matches (e.g., if model returns just "The Claw" instead of full name)
      for (const [name, id] of Object.entries(landmarkNameToId)) {
        if (identifiedNameLower.includes(name) || name.includes(identifiedNameLower)) {
          landmarkId = id;
          break;
        }
      }
    }
    
    // If still no match, use the best guess from the model
    if (!landmarkId) {
      console.log("No matching landmark found for:", identifiedName);
      return {
        label: null,
        provider: "Stanford GPS+VLM",
        confidence: 0
      };
    }
    
    // Normalize the identifiedName to match a known landmark
    const landmark = STANFORD_LANDMARKS.find(l => l.id === landmarkId);
    
    if (!landmark) {
      return {
        label: null,
        provider: "Stanford GPS+VLM",
        confidence: 0
      };
    }
    
    // Store landmark metadata in a global cache for collection reference
    // (This would be expanded in a production system)
    console.log("Identified landmark:", landmark.name);
    
    return {
      label: landmark.name,
      provider: "Stanford GPS+VLM",
      confidence: 1.0
    };
  } catch (error) {
    console.error("Error identifying Stanford landmark:", error);
    return {
      label: null,
      provider: "Stanford GPS+VLM",
      confidence: 0
    };
  }
}
