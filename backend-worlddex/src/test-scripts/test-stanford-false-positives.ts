import 'dotenv/config';
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { identifyLandmark } from "../services/stanfordService";
import { STANFORD_LANDMARKS } from "../data/stanford-landmarks";

// Debug check for API keys
const openaiKey = process.env.OPENAI_API_KEY || '';
console.log("OpenAI API Key available:", openaiKey ? "Yes" : "No");

// Constants to match frontend's useImageProcessor.ts
const MAX_IMAGE_DIMENSION = 1024;
const IMAGE_COMPRESSION_LEVEL = 0.8; // JPEG compression level (0-1)

// Sample GPS coordinates for testing
const SAMPLE_GPS_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Real coordinates for key locations at Stanford
  "hoover-tower": { lat: 37.427467, lng: -122.166962 },
  "memorial-church": { lat: 37.426751, lng: -122.170054 },
  "claw-fountain": { lat: 37.425148859146304, lng: -122.16927807280942 },
  "nvidia-auditorium": { lat: 37.429398, lng: -122.173250 },
  // Default campus location if specific coordinates aren't available
  "default": { lat: 37.4275, lng: -122.1697 } // Center of campus
};

/**
 * Process an image similar to how it would be processed in the frontend
 * using the logic from useImageProcessor.ts
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
      `Image processed for VLM: Original ${originalWidth}x${originalHeight} -> Resized ${Math.round(resizeWidth)}x${Math.round(resizeHeight)}, New Size: ${
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

async function runFalsePositiveTests() {
  console.log("Starting Stanford Landmark False Positive Tests...");
  
  // Define path to general test images
  const TEST_IMAGES_DIR = path.join(__dirname, "../../test-images/general");
  
  // Check if directory exists
  if (!fs.existsSync(TEST_IMAGES_DIR)) {
    console.error(`General test images directory not found: ${TEST_IMAGES_DIR}`);
    process.exit(1);
  }
  
  // Get all image files
  const files = fs.readdirSync(TEST_IMAGES_DIR)
    .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'));
  
  console.log(`Found ${files.length} general test images.`);
  
  const results: Array<{
    filename: string;
    nearLandmark: string;
    identified: string | null;
    correctResult: boolean;
  }> = [];
  
  // Test each image near different Stanford landmarks
  for (const filename of files) {
    const imagePath = path.join(TEST_IMAGES_DIR, filename);
    const base64Data = await processImageForVLM(imagePath);
    
    console.log(`\n--- Testing general image: ${filename} ---`);
    
    // Test the image near various Stanford landmarks to see if we get false positives
    for (const [landmarkId, gps] of Object.entries(SAMPLE_GPS_COORDINATES)) {
      if (landmarkId === "default") continue; // Skip default location
      
      console.log(`Testing near ${landmarkId} at ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`);
      
      const startTime = Date.now();
      const identifyResult = await identifyLandmark(base64Data, gps);
      const endTime = Date.now();
      
      console.log(`Identification time: ${((endTime - startTime) / 1000).toFixed(3)}s`);
      console.log(`Result: ${identifyResult.label || "Not identified"}`);
      
      // For these general items, a correct result is when the system does NOT identify a landmark
      const correctResult = identifyResult.label === null;
      
      results.push({
        filename,
        nearLandmark: landmarkId,
        identified: identifyResult.label,
        correctResult
      });
    }
  }
  
  // Print results in a formatted table
  console.log("\n--- FALSE POSITIVE TEST SUMMARY ---");
  console.log("==========================================================================");
  console.log("| Image                  | Near Landmark      | Identified          | Result  |");
  console.log("==========================================================================");
  
  for (const result of results) {
    console.log(`| ${result.filename.padEnd(23)} | ${result.nearLandmark.padEnd(19)} | ${(result.identified || "Not identified").padEnd(20)} | ${result.correctResult ? "✓" : "✗"}     |`);
  }
  
  console.log("==========================================================================");
  
  const correctCount = results.filter(r => r.correctResult).length;
  const accuracy = (correctCount / results.length) * 100;
  console.log(`False positive accuracy: ${correctCount}/${results.length} (${Math.round(accuracy)}%)`);
  console.log(`This means ${Math.round(accuracy)}% of the time, general objects near landmarks were correctly NOT identified as landmarks.`);
}

// Run the tests
runFalsePositiveTests().catch(error => {
  console.error("Test error:", error);
  process.exit(1);
}); 