import axios from "axios";
import { Tier2Result } from "../../../shared/types/identify";
import * as dotenv from "dotenv";
import path from "path";

// Ensure environment variables are loaded
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Get API key - with logging to help debug
const PLANT_ID_API_KEY = process.env.PLANT_ID_API_KEY;
console.log("plantService - API Key available:", PLANT_ID_API_KEY ? "Yes" : "No");
if (!PLANT_ID_API_KEY) {
  console.warn("PLANT_ID_API_KEY env variable not set - this will cause errors when identifying plants");
}

export async function identifyPlant(base64Data: string): Promise<Tier2Result> {
  // Check for API key
  if (!PLANT_ID_API_KEY) {
    throw new Error("PLANT_ID_API_KEY is not set in environment variables");
  }

  try {
    // Prepare the request payload according to the v3 API requirements
    const payload = {
      images: [base64Data],
      // Use supported modifiers based on the API error message
      classification_level: "species", // One of: all, genus, species
      similar_images: true
    };

    console.log("Making request to Plant.id API v3...");
    
    // Send the POST request to Plant.id API v3
    const response = await axios.post(
      "https://api.plant.id/v3/identification",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Api-Key": PLANT_ID_API_KEY,
        },
      }
    );

    console.log("Plant.id API response received!");
    
    // Extract the result - we'll take the first suggestion
    const result = response.data;
    
    // Check if we have suggestions in the response
    if (!result.result || 
        !result.result.classification || 
        !result.result.classification.suggestions ||
        result.result.classification.suggestions.length === 0) {
      console.log("No identification suggestions found in API response");
      return {
        label: null,
        provider: "Plant.id",
        confidence: 0
      };
    }
    
    const suggestions = result.result.classification.suggestions;
    console.log(`Number of suggestions: ${suggestions.length}`);
    
    // Get the top suggestion
    const topSuggestion = suggestions[0];
    
    // Get the plant name (prefer common name if available)
    // For the v3 API, if details were requested in a subsequent call
    const plantName = topSuggestion.name;
    
    console.log("Plant identification details:", {
      scientificName: plantName,
      confidence: topSuggestion.probability || 0
    });
    
    return {
      label: plantName || null,
      provider: "Plant.id",
      confidence: topSuggestion.probability || 0
    };
  } catch (error) {
    console.error("Error identifying plant:", error);
    if (axios.isAxiosError(error) && error.response) {
      console.error("API error response:", error.response.data);
    }
    throw error;
  }
} 