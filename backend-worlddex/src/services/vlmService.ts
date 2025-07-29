import { OpenAI } from "openai";
import { readFileSync } from "fs";
import { join } from "path";
import { VlmIdentificationRequest, VlmIdentificationResponse } from "../../shared/types/vlm";
import { calculateCost, logCostDetails } from "../utils/aiCostCalculator";
// import { sampleRarityTier } from "../utils/rarity";
import { assignRarityTier } from "../utils/rarity";
import { XpService } from "./xpService";

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
    private bannedLabels: Set<string> = new Set();

    constructor() {
        this.loadBannedLabels();
    }

    /**
     * Load banned labels from the configuration file
     */
    private loadBannedLabels(): void {
        try {
            const bannedLabelsPath = join(__dirname, '../config/banned-labels.txt');
            const fileContent = readFileSync(bannedLabelsPath, 'utf-8');
            
            // Parse the file, ignoring comments and empty lines
            const lines = fileContent.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                // Skip empty lines and comments
                if (trimmed && !trimmed.startsWith('#')) {
                    // Convert to lowercase for case-insensitive matching
                    this.bannedLabels.add(trimmed.toLowerCase());
                }
            }
            
            console.log(`📝 Loaded ${this.bannedLabels.size} banned labels for person detection`);
        } catch (error) {
            console.error('❌ Failed to load banned labels file:', error);
            // Fallback to basic person detection if file can't be loaded
            this.bannedLabels = new Set(['person', 'people', 'man', 'woman', 'child', 'human']);
        }
    }

    /**
     * Check if a label contains banned content that should be auto-rejected
     * Uses smart matching to avoid false positives like "Snowman"
     */
    private isBannedLabel(label: string): boolean {
        if (!label) return false;
        
        const labelLower = label.toLowerCase();
        
        // Direct match check
        if (this.bannedLabels.has(labelLower)) {
            return true;
        }
        
        // Check for exact word matches to avoid false positives
        // Split the label into words and check each word
        const words = labelLower.split(/[\s-_]+/);
        for (const word of words) {
            if (this.bannedLabels.has(word)) {
                // Additional safeguards for compound words
                // Allow words like "snowman", "superman", etc. where "man" is part of a compound
                const isCompoundWord = this.isLikelySafeCompound(labelLower, word);
                if (!isCompoundWord) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Check if a word containing a banned term is likely a safe compound word
     */
    private isLikelySafeCompound(fullLabel: string, bannedWord: string): boolean {
        // List of safe prefixes/suffixes that indicate non-human entities
        const safeCompounds = [
            'snowman', 'snowmen', 'superman', 'batman', 'spiderman', 'ironman',
            'doorman', 'mailman', 'postman', 'fireman', 'fisherman', 'businessman',
            'chairman', 'spokesman', 'craftsman', 'salesman', 'workman', 'yeoman',
            'gingerbread man', 'stick figure', 'toy', 'doll', 'statue', 'sculpture',
            'drawing', 'painting', 'cartoon', 'animated', 'character', 'mascot'
        ];
        
        // Check if the full label matches any safe compound
        for (const safeCompound of safeCompounds) {
            if (fullLabel.includes(safeCompound)) {
                return true;
            }
        }
        
        // Additional context-based checks
        if (fullLabel.includes('toy') || fullLabel.includes('statue') || 
            fullLabel.includes('drawing') || fullLabel.includes('painting') ||
            fullLabel.includes('sculpture') || fullLabel.includes('cartoon')) {
            return true;
        }
        
        return false;
    }

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

            // Check for person-related identifications and auto-reject
            if (identifiedLabel && this.isPersonRelated(identifiedLabel)) {
                console.log(`🚫 Person detected in label: "${identifiedLabel}" - auto-rejecting`);
                // Return a null label to trigger the breaking animation
                return { 
                    label: null,
                    category: "person",
                    subcategory: "auto_rejected",
                    rarityScore: 0,
                    rarityTier: undefined,
                    xpValue: 0
                };
            }

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
            
            // Calculate XP based on rarity tier
            const xpValue = rarityTier ? XpService.calculateCaptureXP(rarityTier) : 0;

            return { 
                label: identifiedLabel,
                category: category,
                subcategory: subcategory,
                rarityScore: rarityScore,
                rarityTier: rarityTier,
                xpValue: xpValue
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