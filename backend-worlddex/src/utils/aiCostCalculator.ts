/**
 * Utility for calculating and logging AI API costs
 */

export interface ModelCostConfig {
    name: string;
    inputCostPerMillionTokens: number;
    outputCostPerMillionTokens: number;
  }
  
  export interface UsageData {
    promptTokens: number;
    completionTokens: number;
  }
  
  export interface CostResult {
    model: string;
    promptTokens: number;
    completionTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  }
  
  /**
   * Pricing for different AI models
   */
  export const MODEL_COSTS: Record<string, ModelCostConfig> = {
    "accounts/fireworks/models/llama-v3p2-11b-vision-instruct": {
      name: "Llama v3p2 11B Vision",
      inputCostPerMillionTokens: 0.20,
      outputCostPerMillionTokens: 0.20
    },
    "accounts/fireworks/models/phi-3-vision-128k-instruct": {
      name: "Phi-3 Vision",
      inputCostPerMillionTokens: 0.20,
      outputCostPerMillionTokens: 0.20
    }
  };
  
  /**
   * Calculate cost based on token usage
   */
  export function calculateCost(modelId: string, usage: UsageData): CostResult {
    const modelConfig = MODEL_COSTS[modelId] || {
      name: modelId,
      inputCostPerMillionTokens: 0,
      outputCostPerMillionTokens: 0
    };
    
    const inputCost = (usage.promptTokens / 1000000) * modelConfig.inputCostPerMillionTokens;
    const outputCost = (usage.completionTokens / 1000000) * modelConfig.outputCostPerMillionTokens;
    
    return {
      model: modelConfig.name,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }
  
  export function logCostDetails(costResult: CostResult): void {
    console.log("\n--- API Request Cost ---");
    console.log(`Model: ${costResult.model}`);
    console.log(`Prompt Tokens: ${costResult.promptTokens} ($${costResult.inputCost.toFixed(8)})`);
    console.log(`Completion Tokens: ${costResult.completionTokens} ($${costResult.outputCost.toFixed(8)})`);
    console.log(`Total Cost: $${costResult.totalCost.toFixed(8)}`);
    console.log("------------------------\n");
  }