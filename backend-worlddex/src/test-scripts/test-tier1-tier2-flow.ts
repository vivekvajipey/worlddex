import 'dotenv/config';
import fs from "fs";
import path from "path";
import { VlmService } from "../services/vlmService";
import { decideTier2 } from "../services/routerService";
import { identifyPlant } from "../services/plantService";

// Debug check for API keys and print them partially for debugging
const openaiKey = process.env.OPENAI_API_KEY || '';
const plantidKey = process.env.PLANT_ID_API_KEY || '';

console.log("OpenAI API Key available:", openaiKey ? "Yes" : "No");
console.log("OpenAI API Key (first 10 chars):", openaiKey.substring(0, 10) + "...");
console.log("Plant.id API Key available:", plantidKey ? "Yes" : "No");
console.log("Plant.id API Key (first 10 chars):", plantidKey.substring(0, 10) + "...");

async function testIdentificationFlow() {
  try {
    // Path to a test image
    const testImagePath = path.join(__dirname, "../../test-images/test-plant.jpg");
    
    if (!fs.existsSync(testImagePath)) {
      console.error("Test image not found at path:", testImagePath);
      return;
    }
    
    // Read the image file and convert to base64
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Data = imageBuffer.toString("base64");
    
    console.log("Starting identification flow test...");
    console.log("Image loaded, size:", imageBuffer.length, "bytes");
    
    // Step 1: Tier 1 identification with VLM
    console.log("\n--- TIER 1 IDENTIFICATION ---");
    const vlmService = new VlmService();
    console.time("Tier 1 API Request Time");
    
    const tier1Result = await vlmService.identifyImage({
      base64Data,
      contentType: "image/jpeg"
    });
    
    console.timeEnd("Tier 1 API Request Time");
    console.log("Tier 1 Result:", tier1Result);
    
    // Step 2: Determine if Tier 2 is needed
    console.log("\n--- TIER 2 ROUTING DECISION ---");
    // Test with Organisms collection
    const activeCollections = ["Organisms"];
    const routing = decideTier2(
      tier1Result.label,
      activeCollections,
      null, // No GPS
      tier1Result.category,
      tier1Result.subcategory
    );
    
    console.log("Tier 2 Routing Decision:", routing);
    
    // Step 3: If Tier 2 is needed, run the appropriate service
    if (routing.run) {
      console.log("\n--- TIER 2 IDENTIFICATION ---");
      console.time("Tier 2 API Request Time");
      
      let tier2Result;
      if (routing.module === "species") {
        tier2Result = await identifyPlant(base64Data);
      } else {
        console.log("Module not supported in this test:", routing.module);
        return;
      }
      
      console.timeEnd("Tier 2 API Request Time");
      console.log("Tier 2 Result:", tier2Result);
      
      // Final result
      console.log("\n--- FINAL IDENTIFICATION RESULT ---");
      console.log("Tier 1 Label:", tier1Result.label);
      console.log("Tier 1 Category:", tier1Result.category);
      console.log("Tier 2 Label:", tier2Result.label);
      console.log("Tier 2 Confidence:", tier2Result.confidence);
      console.log("Tier 2 Provider:", tier2Result.provider);
    } else {
      console.log("\n--- FINAL IDENTIFICATION RESULT ---");
      console.log("No Tier 2 identification needed.");
      console.log("Final Label:", tier1Result.label);
    }
    
  } catch (error) {
    console.error("Error in identification flow test:");
    console.error(error);
  }
}

// Run the test
testIdentificationFlow().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 