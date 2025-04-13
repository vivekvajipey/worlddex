import { OpenAI } from "openai";
import { VlmIdentificationRequest, VlmIdentificationResponse } from "../../../shared/types/vlm";
import { calculateCost, logCostDetails } from "../utils/aiCostCalculator";

if (!process.env.FIREWORKS_API_KEY) {
    throw new Error("FIREWORKS_API_KEY env variable not set");
}

const fireworksClient = new OpenAI({
    baseURL: "https://api.fireworks.ai/inference/v1",
    apiKey: process.env.FIREWORKS_API_KEY
});

const VLM_MODEL_FIREWORKS = "accounts/fireworks/models/llama-v3p2-11b-vision-instruct";

export class VlmService {
    // super basic prompt for initial testing
    private getIdentificationPrompt(): string {
        return "Identify the primary subject in the image. Respond with ONLY the most specific common name possible for the subject, using Title Case.";
    }

    async identifyImage(payload: VlmIdentificationRequest): Promise<VlmIdentificationResponse> {
        const { base64Data, contentType } = payload;

        if (!base64Data || !contentType) {
            throw new Error("Missing base64Data or contentType for VLM identification");
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
            console.log(`Calling VLM model: ${VLM_MODEL_FIREWORKS}`);
            const response = await fireworksClient.chat.completions.create({
                model: VLM_MODEL_FIREWORKS,
                messages: messages,
                max_tokens: 50,
                temperature: 0.0
            });

            console.log("VLM Response:\n", response);

            const label = response?.choices?.[0]?.message?.content?.trim() || null;

            // Calculate and log cost using the utility
            if (response.usage) {
                const costResult = calculateCost(VLM_MODEL_FIREWORKS, {
                    promptTokens: response.usage.prompt_tokens || 0,
                    completionTokens: response.usage.completion_tokens || 0
                });
                logCostDetails(costResult);
            } else {
                console.log("Could not calculate cost: Usage data not found in response.");
            }

            return { label };

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