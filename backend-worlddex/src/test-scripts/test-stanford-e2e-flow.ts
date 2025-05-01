import 'dotenv/config';
import fs from "fs";
import path from "path";
import { VlmService } from "../services/vlmService";
import { decideTier2 } from "../services/routerService";
import { identifyLandmark } from "../services/stanfordService";
import { identifyPlant } from "../services/plantService";

// Debug check for API keys
const openaiKey = process.env.OPENAI_API_KEY || '';
console.log("OpenAI API Key available:", openaiKey ? "Yes" : "No");
console.log("OpenAI API Key (first 10 chars):", openaiKey.substring(0, 10) + "...");

async function testStanfordE2EFlow() {
  try {
    // Path to a test image - using The Claw image
    const testImagePath = path.join(__dirname, "../../test-images/theclaw.jpeg");
    
    if (!fs.existsSync(testImagePath)) {
      console.error("Test image not found at path:", testImagePath);
      return;
    }
    
    // Read the image file and convert to base64
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Data = imageBuffer.toString("base64");
    
    console.log("Starting Stanford E2E identification flow test...");
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
    
    // Step 2: Test multiple routing scenarios
    
    // Test Case 1: Within Stanford, "Stanford" collection active
    console.log("\n--- TEST CASE 1: Stanford Campus, Stanford Collection ---");
    // GPS coordinates for The Claw
    const stanfordGps = { lat: 37.42520, lng: -122.16930 };
    
    const routing1 = decideTier2(
      tier1Result.label,
      stanfordGps,
      tier1Result.category,
      tier1Result.subcategory
    );
    
    console.log("Routing Decision 1:", routing1);
    
    // Test Case 2: Within Stanford, both "Stanford" and "Organisms" collections active
    console.log("\n--- TEST CASE 2: Stanford Campus, Both Collections ---");
    
    const routing2 = decideTier2(
      tier1Result.label,
      stanfordGps,
      tier1Result.category,
      tier1Result.subcategory
    );
    
    console.log("Routing Decision 2:", routing2);
    
    // Step 3: Run the appropriate Tier 2 identification based on routing1
    if (routing1.run) {
      console.log("\n--- TIER 2 IDENTIFICATION ---");
      console.time("Tier 2 API Request Time");
      
      let tier2Result;
      if (routing1.module === "landmark") {
        // Use the identifyLandmark function with GPS
        tier2Result = await identifyLandmark(base64Data, stanfordGps);
      } else if (routing1.module === "species") {
        tier2Result = await identifyPlant(base64Data);
      } else {
        console.log("Module not supported in this test:", routing1.module);
        return;
      }
      
      console.timeEnd("Tier 2 API Request Time");
      console.log("Tier 2 Result:", tier2Result);
      
      // Final result
      console.log("\n--- FINAL IDENTIFICATION RESULT ---");
      console.log("Tier 1 Label:", tier1Result.label);
      console.log("Tier 1 Category:", tier1Result.category);
      console.log("Tier 2 Label:", tier2Result.label);
      console.log("Tier 2 Provider:", tier2Result.provider);
    } else {
      console.log("\n--- FINAL IDENTIFICATION RESULT ---");
      console.log("No Tier 2 identification needed.");
      console.log("Final Label:", tier1Result.label);
    }
    
  } catch (error) {
    console.error("Error in Stanford E2E flow test:");
    console.error(error);
  }
}

// Run the test
testStanfordE2EFlow().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 