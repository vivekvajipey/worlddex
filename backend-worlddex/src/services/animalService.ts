import { OpenAI } from "openai";
import { Tier2Result } from "../../shared/types/identify";
import * as dotenv from "dotenv";
import path from "path";
import { identifyAnimal as identifyAnimalFromIdentificationService } from "./animalIdentificationService";

// Ensure environment variables are loaded
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Get API key - with logging to help debug
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("AnimalService - OpenAI API Key available:", OPENAI_API_KEY ? "Yes" : "No");
if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY env variable not set - this will cause errors when identifying animals");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * @deprecated This file is deprecated. Use animalIdentificationService.ts instead.
 */

/**
 * @deprecated Use animalIdentificationService.ts instead
 * Proxy to animalIdentificationService for backward compatibility
 */
export async function identifyAnimal(base64Data: string, tier1Label: string): Promise<Tier2Result> {
  throw new Error("animalService.ts is deprecated. Please update your imports to use 'animalIdentificationService.ts' instead.");
}

/**
 * Identify a specific animal species or breed from an image
 * @param base64Data Base64 encoded image data
 * @param tier1Label The general category detected by tier1 (e.g., "dog", "bird")
 * @returns More specific identification of the animal (e.g., "Stellar's Jay" instead of just "bird")
 */
export async function identifyAnimalNew(base64Data: string, tier1Label: string): Promise<Tier2Result> {
  try {
    console.log(`Identifying specific animal type for tier1 label: ${tier1Label}`);
    
    // Determine what kind of animal we're looking at to customize the prompt
    const animalType = tier1Label.toLowerCase();
    let expertRole = "animal species identifier";
    let specificPrompt = "";
    
    if (animalType.includes("bird")) {
      expertRole = "expert ornithologist and bird identifier";
      specificPrompt = "Identify the exact species of bird in this image. Include the common name and scientific name if possible.";
    } else if (animalType.includes("dog")) {
      expertRole = "expert dog breed identifier";
      specificPrompt = "Identify the breed of dog in this image. For mixed breeds, list the most likely breeds in the mix.";
    } else if (animalType.includes("cat")) {
      expertRole = "expert cat breed identifier";
      specificPrompt = "Identify the breed of cat in this image. For mixed breeds, list the most likely breeds in the mix.";
    } else {
      specificPrompt = "Identify the specific species or breed of animal in this image as precisely as possible. Include the common name and scientific name if applicable.";
    }
    
    // Call OpenAI Vision API to identify the animal
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini-2025-04-14",
      messages: [
        {
          role: "system",
          content: `You are an ${expertRole}. Given an image of an animal identified as "${tier1Label}", provide a more specific identification. Be as precise as possible while remaining accurate. If you cannot identify the specific species/breed with reasonable confidence, respond with the word "UNIDENTIFIABLE" and nothing else.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${specificPrompt}
              
IMPORTANT INSTRUCTIONS:
1. Only respond with the specific name of the animal (e.g., "Steller's Jay" instead of just "bird", or "Golden Retriever" instead of just "dog").
2. Do not include any explanations or descriptions.
3. Be specific but accurate - if you cannot identify the specific species/breed with reasonable confidence, just respond with the word "UNIDENTIFIABLE" (all caps).
4. Be precise - for example with birds, identify the exact species rather than just the family.`
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
    
    const identifiedResponse = response.choices[0].message.content?.trim() || "";
    console.log("Animal identification response:", identifiedResponse);
    
    // If model couldn't identify the specific animal
    if (identifiedResponse === "UNIDENTIFIABLE") {
      console.log("Model could not identify the specific animal type with confidence");
      return {
        label: null,
        provider: "OpenAI Vision",
        confidence: 0
      };
    }
    
    return {
      label: identifiedResponse,
      provider: "OpenAI Vision",
      confidence: 0.9 // Since we don't get confidence from this API, use a reasonable default
    };
  } catch (error) {
    console.error("Error identifying animal:", error);
    return {
      label: null,
      provider: "OpenAI Vision",
      confidence: 0
    };
  }
} 