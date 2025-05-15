import 'dotenv/config';
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { decideTier2 } from "../services/routerService";
import { identifyAnimal } from "../services/animalIdentificationService";

console.log("==== TESTING TIER 1 -> TIER 2 PIPELINE ====\n");

// Constants to match frontend's useImageProcessor.ts
const MAX_IMAGE_DIMENSION = 1024;
const IMAGE_COMPRESSION_LEVEL = 0.8; // JPEG compression level (0-1)

/**
 * Process an image similar to how it would be processed in the frontend
 */
async function processImageForVLM(imagePath: string): Promise<string> {
  try {
    // Get image metadata
    const metadata = await sharp(imagePath).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;
    
    // Calculate resize dimensions (matching frontend logic)
    let resizeWidth = originalWidth;
    let resizeHeight = originalHeight;
    
    if (originalWidth > MAX_IMAGE_DIMENSION || originalHeight > MAX_IMAGE_DIMENSION) {
      if (originalWidth > originalHeight) {
        resizeWidth = MAX_IMAGE_DIMENSION;
        resizeHeight = Math.round((originalHeight / originalWidth) * MAX_IMAGE_DIMENSION);
      } else {
        resizeHeight = MAX_IMAGE_DIMENSION;
        resizeWidth = Math.round((originalWidth / originalHeight) * MAX_IMAGE_DIMENSION);
      }
    }
    
    // Process image: resize and compress
    const processedImageBuffer = await sharp(imagePath)
      .resize(Math.round(resizeWidth), Math.round(resizeHeight))
      .jpeg({ quality: Math.round(IMAGE_COMPRESSION_LEVEL * 100) })
      .toBuffer();
    
    // Convert to base64
    const base64Data = processedImageBuffer.toString('base64');
    
    console.log(
      `Image processed: Original ${originalWidth}x${originalHeight} -> Resized ${Math.round(resizeWidth)}x${Math.round(resizeHeight)}, Size: ${
        Math.round((base64Data.length * 3) / 4 / 1024)
      } KB`
    );
    
    return base64Data;
  } catch (error) {
    console.error("Error processing image:", error);
    // Fallback to reading the raw file if processing fails
    const rawImage = fs.readFileSync(imagePath, { encoding: 'base64' });
    console.log("Falling back to raw image data");
    return rawImage;
  }
}

/**
 * Test the Tier 1 -> Tier 2 pipeline
 * This tests:
 * 1. The router service correctly routes based on tier1 label and category
 * 2. The animal identification service correctly identifies specific animals
 */
async function testTier1Tier2Pipeline() {
  // Test cases with tier1 labels and expected routing
  const testCases = [
    {
      directory: "birds",
      files: ["dark-eyed-junko-1.png", "stellar's-jay-1.jpeg"],
      tier1Label: "bird",
      expectedModule: "animals",
      category: "bird"
    },
    {
      directory: "animals",
      files: ["racoon-1.png"],
      tier1Label: "animal",
      expectedModule: "animals",
      category: "animal"
    }
  ];
  
  // Track test statistics
  let totalTests = 0;
  let passedRouterTests = 0;
  let passedIdentificationTests = 0;
  let failedTests = 0;
  
  // Process each test case
  for (const testCase of testCases) {
    console.log(`\n==== Testing ${testCase.directory} with tier1 label: ${testCase.tier1Label} ====`);
    
    // First test the router decision
    const routerDecision = decideTier2(
      testCase.tier1Label,
      null, // GPS
      testCase.category, // Use the category property
      null // subcategory
    );
    
    console.log(`Router decision: ${JSON.stringify(routerDecision)}`);
    
    if (!routerDecision.run) {
      console.log(`❌ Router decided NOT to run Tier 2 for ${testCase.tier1Label}`);
      failedTests++;
      continue;
    }
    
    if (routerDecision.module !== testCase.expectedModule) {
      console.log(`❌ Router routed to "${routerDecision.module}" module instead of "${testCase.expectedModule}"`);
      failedTests++;
      continue;
    }
    
    console.log(`✅ Router correctly decided to run Tier 2 with module: ${routerDecision.module}`);
    passedRouterTests++;
    
    // Now test the actual identification for each file
    for (const filename of testCase.files) {
      totalTests++;
      
      const imagePath = path.join(__dirname, `../../test-images/${testCase.directory}/${filename}`);
      
      if (!fs.existsSync(imagePath)) {
        console.log(`❌ Test image not found: ${imagePath}`);
        failedTests++;
        continue;
      }
      
      console.log(`\n--- Testing ${filename} ---`);
      
      try {
        // Process the image
        const base64Data = await processImageForVLM(imagePath);
        
        // Time the identification
        const startTime = Date.now();
        const result = await identifyAnimal(base64Data, testCase.tier1Label);
        const endTime = Date.now();
        
        console.log(`Identification time: ${((endTime - startTime) / 1000).toFixed(3)}s`);
        console.log(`Result: ${result.label || "Not identified"}`);
        console.log(`Provider: ${result.provider}`);
        
        if (result.label) {
          console.log(`✅ Successfully identified as: ${result.label}`);
          passedIdentificationTests++;
        } else {
          console.log(`❌ Failed to identify the animal`);
          failedTests++;
        }
      } catch (error) {
        console.error("Error during identification:", error);
        console.log(`❌ Test failed due to error`);
        failedTests++;
      }
    }
  }
  
  // Print test summary
  console.log("\n==== TEST SUMMARY ====");
  console.log(`Total tests: ${totalTests}`);
  console.log(`Router tests passed: ${passedRouterTests}`);
  console.log(`Identification tests passed: ${passedIdentificationTests}`);
  console.log(`Failed tests: ${failedTests}`);
  
  // Return true if all tests passed
  return failedTests === 0;
}

// Run the test
testTier1Tier2Pipeline()
  .then(success => {
    console.log(`\nTest result: ${success ? "SUCCESS" : "FAILURE"}`);
    if (!success) {
      process.exit(1); // Exit with error code if tests failed
    }
  })
  .catch(error => {
    console.error("Unexpected test error:", error);
    process.exit(1);
  }); 