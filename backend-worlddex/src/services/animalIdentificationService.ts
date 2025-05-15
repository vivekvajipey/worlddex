import { OpenAI } from "openai";
import { Tier2Result } from "../../shared/types/identify";
import * as dotenv from "dotenv";
import path from "path";
import axios from "axios";

// Ensure environment variables are loaded
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Get API keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log("AnimalIdentificationService - OpenAI API Key available:", OPENAI_API_KEY ? "Yes" : "No");
console.log("AnimalIdentificationService - Gemini API Key available:", GEMINI_API_KEY ? "Yes" : "No");

if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY env variable not set!");
}

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY env variable not set!");
}

// Initialize OpenAI client
const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });

// Initialize Gemini client via OpenAI compatibility layer (used as fallback)
const geminiClientCompatibility = new OpenAI({
  apiKey: GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

/**
 * Identify a specific animal species or breed from an image
 * @param base64Data Base64 encoded image data
 * @param tier1Label The general category detected by tier1 (e.g., "dog", "bird")
 * @returns More specific identification of the animal (e.g., "Stellar's Jay" instead of just "bird")
 */
export async function identifyAnimal(
  base64Data: string, 
  tier1Label: string
): Promise<Tier2Result> {
  try {
    // First try with the direct Gemini API approach
    try {
      return await identifyAnimalWithGeminiDirect(base64Data, tier1Label);
    } catch (geminiError) {
      console.error("Error with direct Gemini API:", geminiError);
      console.log("Falling back to OpenAI for animal identification...");
      
      // Fall back to OpenAI
      return await identifyAnimalWithOpenAI(base64Data, tier1Label);
    }
  } catch (error) {
    console.error("Error identifying animal:", error);
    return {
      label: null,
      provider: "error",
      confidence: 0
    };
  }
}

/**
 * Identify animal using direct Gemini API (not through OpenAI compatibility layer)
 */
async function identifyAnimalWithGeminiDirect(
  base64Data: string, 
  tier1Label: string
): Promise<Tier2Result> {
  console.log(`Using Gemini API directly to identify specific animal type for tier1 label: ${tier1Label}`);
  
  try {
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
    
    // Use the correct model name for Gemini 2.5 Flash Preview
    const model = "gemini-2.5-flash-preview-04-17";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    // Prepare the system message and user prompt
    const systemMessage = `You are an ${expertRole}. Given an image of an animal identified as "${tier1Label}", provide a more specific identification. Be as precise as possible while remaining accurate. If you cannot identify the specific species/breed with reasonable confidence, respond with the word "UNIDENTIFIABLE" and nothing else.`;
    
    const userPrompt = `${specificPrompt}
    
IMPORTANT INSTRUCTIONS:
1. Only respond with the specific name of the animal (e.g., "Steller's Jay" instead of just "bird", or "Golden Retriever" instead of just "dog").
2. Do not include any explanations or descriptions.
3. Be specific but accurate - if you cannot identify the specific species/breed with reasonable confidence, just respond with the word "UNIDENTIFIABLE" (all caps).
4. Be precise - for example with birds, identify the exact species rather than just the family.`;
    
    // Prepare the API request payload
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: systemMessage + "\n\n" + userPrompt
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      generation_config: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 200,
        stopSequences: [],
        // Disable thinking to prevent token usage on reasoning process
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
    };
    
    // Make the API request
    console.log(`Calling Gemini API with model: ${model}`);
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    // Extract the identification from the response
    const result = response.data;
    console.log("Gemini API response:", JSON.stringify(result, null, 2));
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content.parts[0].text) {
      console.log("No valid identification found in Gemini response");
      return {
        label: null,
        provider: "gemini-direct",
        confidence: 0
      };
    }
    
    const identifiedResponse = result.candidates[0].content.parts[0].text.trim();
    console.log(`Gemini API identified: ${identifiedResponse}`);
    
    // If model couldn't identify the specific animal
    if (identifiedResponse === "UNIDENTIFIABLE") {
      console.log("Gemini API could not identify the specific animal type with confidence");
      return {
        label: null,
        provider: "gemini-direct",
        confidence: 0
      };
    }
    
    return {
      label: identifiedResponse,
      provider: "gemini-direct",
      confidence: 0.9 // Since we don't get confidence from these APIs, use a reasonable default
    };
  } catch (error) {
    console.error("Error with direct Gemini API:", error);
    throw error; // Re-throw to allow fallback
  }
}

/**
 * Identify animal using OpenAI
 */
async function identifyAnimalWithOpenAI(
  base64Data: string, 
  tier1Label: string
): Promise<Tier2Result> {
  console.log(`Using OpenAI to identify specific animal type for tier1 label: ${tier1Label}`);
  
  try {
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
    
    // Call OpenAI's Vision API to identify the animal
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o",
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
      max_tokens: 150
    });
    
    const identifiedResponse = response.choices[0].message.content?.trim() || "";
    console.log(`OpenAI identified: ${identifiedResponse}`);
    
    // If model couldn't identify the specific animal
    if (identifiedResponse === "UNIDENTIFIABLE") {
      console.log("OpenAI could not identify the specific animal type with confidence");
      return {
        label: null,
        provider: "openai",
        confidence: 0
      };
    }
    
    return {
      label: identifiedResponse,
      provider: "openai",
      confidence: 0.9 // Since we don't get confidence from these APIs, use a reasonable default
    };
  } catch (error) {
    console.error("Error with OpenAI:", error);
    return {
      label: null,
      provider: "openai-error",
      confidence: 0
    };
  }
} 