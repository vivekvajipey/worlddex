import { OpenAI } from "openai";
import { Tier2Result } from "../../../shared/types/identify";
import { calculateDistance } from "../utils/geoUtils";

// Get API key - with logging to help debug
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("StanfordService - OpenAI API Key available:", OPENAI_API_KEY ? "Yes" : "No");
if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY env variable not set - this will cause errors when identifying landmarks");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Stanford landmark definition with coordinates and identification radius
 */
interface StanfordLandmark {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  radius: number; // in meters
}

/**
 * List of Stanford landmarks with their coordinates and identification radii
 */
const STANFORD_LANDMARKS: StanfordLandmark[] = [
  {
    id: "the-claw",
    name: "The Claw (White Memorial Fountain)",
    coordinates: { lat: 37.425148859146304, lng: -122.16927807280942 },
    radius: 30 // meters
  },
  {
    id: "hoover-tower",
    name: "Hoover Tower",
    coordinates: { lat: 37.427467, lng: -122.166962 },
    radius: 50 // meters
  },
  {
    id: "memorial-church",
    name: "Memorial Church",
    coordinates: { lat: 37.426751, lng: -122.170054 },
    radius: 40 // meters
  },
  {
    id: "cantor-museum",
    name: "Cantor Museum",
    coordinates: { lat: 37.430919, lng: -122.167281 },
    radius: 40 // meters
  },
  {
    id: "main-quad",
    name: "Main Quad",
    coordinates: { lat: 37.427238, lng: -122.169438 },
    radius: 80 // meters - larger area
  },
  {
    id: "green-library",
    name: "Green Library",
    coordinates: { lat: 37.426933, lng: -122.165844 },
    radius: 40 // meters
  }
];

/**
 * Get landmarks that are near the user's current location
 * @param gps User's GPS coordinates
 * @returns Array of landmarks within their defined radii of the user
 */
function getNearbyLandmarks(gps: { lat: number; lng: number }): StanfordLandmark[] {
  return STANFORD_LANDMARKS.filter(landmark => {
    const distance = calculateDistance(
      gps.lat, gps.lng,
      landmark.coordinates.lat, landmark.coordinates.lng
    );
    return distance <= landmark.radius;
  });
}

/**
 * Identify a Stanford landmark from an image, with optional GPS filtering
 * @param base64Data Base64-encoded image data
 * @param gps Optional GPS coordinates of the image
 * @returns Tier2Result with landmark name or null if not identified
 */
export async function identifyLandmark(
  base64Data: string,
  gps?: { lat: number; lng: number } | null
): Promise<Tier2Result> {
  // If GPS coordinates are provided, only include landmarks that are within range
  const landmarks = gps ? getNearbyLandmarks(gps) : STANFORD_LANDMARKS;
  
  // If there are no nearby landmarks and GPS was provided, return unknown
  if (gps && landmarks.length === 0) {
    console.log("No Stanford landmarks within range of user's location");
    return {
      label: null,
      provider: "GPS+OpenAI",
      confidence: 1
    };
  }
  
  // Build a prompt with filtered landmarks
  const landmarkList = landmarks.map(l => `- ${l.name}`).join("\n");
  
  const prompt = `
You are a Stanford University tour guide. Based on the image, identify which of the following Stanford landmarks is shown:
${landmarkList}

If none of these landmarks are in the image, respond with "Unknown".
Respond ONLY with the exact name of the landmark from the list or "Unknown".`;

  console.log("Stanford landmarks being considered:", landmarks.map(l => l.name));

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-4.1-mini-2025-04-14",
      temperature: 0,
      max_tokens: 15,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
        ]
      }]
    });

    const response = chat.choices[0].message.content?.trim() || null;
    console.log("Stanford landmark identification response:", response);
    
    return {
      label: response === "Unknown" ? null : response,
      provider: "Stanford GPS+VLM",
      confidence: 1 // Fixed confidence as requested
    };
  } catch (error) {
    console.error("Error identifying Stanford landmark:", error);
    throw error;
  }
}
