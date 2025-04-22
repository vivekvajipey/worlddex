import axios from "axios";
import { Tier2Result } from "../../../shared/types/identify";

// Check if API key is available
if (!process.env.PLANT_ID_API_KEY) {
  console.warn("PLANT_ID_API_KEY env variable not set");
}

export async function identifyPlant(base64Data: string): Promise<Tier2Result> {
  if (!process.env.PLANT_ID_API_KEY) {
    throw new Error("PLANT_ID_API_KEY is not set in environment variables");
  }

  try {
    // Prepare the request payload
    const payload = {
      images: [base64Data],
      // Request specific details about the plant
      details: ["common_names", "taxonomy", "url"],
      classification_level: "all", // for genus, species, infraspecies
    };

    // Send the POST request to Kindwise Plant ID API
    const response = await axios.post(
      "https://api.plant.id/v3/identification",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Api-Key": process.env.PLANT_ID_API_KEY,
        },
      }
    );

    // Extract the result - we'll take the first suggestion
    const result = response.data;
    const topSuggestion = result.suggestions?.[0];
    
    if (!topSuggestion) {
      return {
        label: null,
        provider: "Plant.id",
        confidence: 0
      };
    }

    // Get the common name if available, otherwise use scientific name
    const plantName = topSuggestion.plant_details?.common_names?.[0] || 
                     topSuggestion.plant_name;
    
    return {
      label: plantName || null,
      provider: "Plant.id",
      confidence: topSuggestion.probability || 0
    };
  } catch (error) {
    console.error("Error identifying plant:", error);
    throw error;
  }
} 