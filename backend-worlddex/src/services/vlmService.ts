import { OpenAI } from "openai";
import { VlmIdentificationRequest, VlmIdentificationResponse } from "../../shared/types/vlm";
import { calculateCost, logCostDetails } from "../utils/aiCostCalculator";
// import { sampleRarityTier } from "../utils/rarity";
import { assignRarityTier } from "../utils/rarity";

const UNIDENTIFIED_RESPONSE = "Unidentified"; // failure keyword for VLM to respond

// Get API key - with logging to help debug
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("VlmService - OpenAI API Key available:", OPENAI_API_KEY ? "Yes" : "No");
if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY env variable not set - this will cause errors when calling the VLM");
}

const vlmClient = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// const VLM_MODEL = "accounts/fireworks/models/llama-v3p2-11b-vision-instruct";
// const VLM_MODEL = "gpt-4.1-nano-2025-04-14";
const VLM_MODEL = "gpt-4.1-mini-2025-04-14";

export class VlmService {
    // Updated prompt to return structured data
//     private getIdentificationPrompt(): string {
//         return `Identify the primary subject in the image. Return a JSON object with:
// - label: The most specific common name for the subject in Title Case (keep it succinct)
// - category: One of ["plant", "animal", "landmark", "object", "food", "person", "scene", "other"]
// - subcategory: A more specific category (e.g., "tree", "bird", "building", "vehicle", etc.)

// If there is no clear subject, set label to "${UNIDENTIFIED_RESPONSE}" and category to "other".`;
//     }
    private getIdentificationPrompt(): string {
        return `Identify the primary subject and rate the capture's rarity from 1-100:
    
    - "Rarity" means how surprising or aesthetically striking the photo is.
    - 1 = boring / ordinary; 100 = stunning or extremely interesting.
    - Think about colour, composition, and how often the subject is witnessed/photographed (it should be interesting).
    
    Return **ONLY** valid JSON, for example:
    {
        "label": "Red-tailed Hawk",
        "category": "animal",
        "subcategory": "bird",
        "rarityScore": 87
    }
    If there is no clear subject, return ONLY: 
    {
        "label": "${UNIDENTIFIED_RESPONSE}",
        "category": "null",
        "subcategory": "null",
        "rarityScore": "0"
    }
    `;
    }

    async identifyImage(payload: VlmIdentificationRequest): Promise<VlmIdentificationResponse> {
        const { base64Data, contentType } = payload;

        if (!base64Data || !contentType) {
            throw new Error("Missing base64Data or contentType for VLM identification");
        }

        if (!OPENAI_API_KEY) {
            throw new Error("Cannot identify image: OPENAI_API_KEY is not set in environment variables");
        }

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                "role": "user",
                "content": [
                    { "type": "text", "text": this.getIdentificationPrompt() },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": `data:${contentType};base64,${base64Data}`
                        }
                    }
                ]
            }
        ];

        try {
            console.log(`Calling VLM model: ${VLM_MODEL}`);
            const response = await vlmClient.chat.completions.create({
                model: VLM_MODEL,
                messages: messages,
                max_tokens: 250,
                temperature: 0.0,
                response_format: { type: "json_object" }
            });

            console.log("VLM Response:\n", response);

            let identifiedLabel: string | null = null;
            let category: string | null = null;
            let subcategory: string | null = null;
            let rarityScore: number | undefined = undefined;
            
            try {
                // Parse the JSON response
                const content = response?.choices?.[0]?.message?.content?.trim() || "";
                const parsedResponse = JSON.parse(content);
                
                console.log("Parsed VLM Response:", parsedResponse);
                
                identifiedLabel = parsedResponse.label || null;
                category = parsedResponse.category || null;
                subcategory = parsedResponse.subcategory || null;
                rarityScore = parsedResponse.rarityScore ? Number(parsedResponse.rarityScore) : undefined;
                
                // Check if the response is "Unidentified"
                if (identifiedLabel?.includes(UNIDENTIFIED_RESPONSE)) {
                    identifiedLabel = null;
                    rarityScore = 0;
                }
            } catch (parseError) {
                console.error("Error parsing VLM JSON response:", parseError);
                // If JSON parsing fails, try to extract label directly
                identifiedLabel = response?.choices?.[0]?.message?.content?.trim() || null;
                if (identifiedLabel?.includes(UNIDENTIFIED_RESPONSE)) {
                    identifiedLabel = null;
                }
            }

            console.log("Processed VLM Results:", { identifiedLabel, category, subcategory, rarityScore });

            // Calculate and log cost using the utility
            if (response.usage) {
                const costResult = calculateCost(VLM_MODEL, {
                    promptTokens: response.usage.prompt_tokens || 0,
                    completionTokens: response.usage.completion_tokens || 0
                });
                logCostDetails(costResult);
            } else {
                console.log("Could not calculate cost: Usage data not found in response.");
            }

            // Calculate rarity tier if we have a rarity score
            const rarityTier = rarityScore !== undefined ? assignRarityTier(rarityScore) : undefined;

            return { 
                label: identifiedLabel,
                category: category,
                subcategory: subcategory,
                rarityScore: rarityScore,
                rarityTier: rarityTier
            };

        } catch (error: unknown) {
            console.error("Error calling VLM service:", error);
            
            if (error instanceof Error) {
                const apiError = (error as any).error;
                if (apiError?.message) {
                    throw new Error(`VLM API error: ${apiError.message}`);
                }
                throw new Error(`VLM error: ${error.message}`);
            }
            throw new Error("VLM identification failed due to an unknown error");
        }
    }
}