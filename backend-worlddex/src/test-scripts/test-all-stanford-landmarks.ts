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
  // Real coordinates for key locations
  "lake-lag": { lat: 37.42264747184378, lng: -122.17610251868331 },
  "dish-satellite": { lat: 37.40878686050767, lng: -122.17842438062284 },
  "hoover-tower": { lat: 37.427467, lng: -122.166962 },
  "memorial-church": { lat: 37.426751, lng: -122.170054 },
  "the-oval": { lat: 37.429327, lng: -122.169902 },
  "claw-fountain": { lat: 37.425148859146304, lng: -122.16927807280942 },
  "engineering-quad-planets": { lat: 37.428879, lng: -122.173183 },
  "stone-sphere": { lat: 37.429062, lng: -122.173497 },
  // Default campus location if specific coordinates aren't available
  "default": { lat: 37.4275, lng: -122.1697 } // Center of campus
};

// Prepare landmark lookup maps
const nameToId: Record<string, string> = {};
const idToName: Record<string, string> = {};

STANFORD_LANDMARKS.forEach(landmark => {
  nameToId[landmark.name.toLowerCase()] = landmark.id;
  idToName[landmark.id.toLowerCase()] = landmark.name;
});

// Check if images directory exists
const TEST_IMAGES_DIR = path.join(__dirname, "../../test-images/stanford");
if (!fs.existsSync(TEST_IMAGES_DIR)) {
  console.error(`Test images directory not found: ${TEST_IMAGES_DIR}`);
  process.exit(1);
}

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

/**
 * Gets appropriate GPS coordinates for testing based on the expected landmark
 */
function getTestGpsCoordinates(expectedId: string): { lat: number; lng: number } | null {
  // Use specific GPS coordinates if available, otherwise a default campus location
  // For testing purposes, we'll use GPS to disambiguate Lake Lag from The Dish
  if (expectedId === "lake-lag" || expectedId === "dish-satellite") {
    return SAMPLE_GPS_COORDINATES[expectedId];
  }
  
  // For other landmarks, use coordinates if available or the default
  return SAMPLE_GPS_COORDINATES[expectedId] || SAMPLE_GPS_COORDINATES.default;
}

async function runTests() {
  console.log("Starting Stanford Landmark Identification Tests...");
  
  // Get all image files
  const files = fs.readdirSync(TEST_IMAGES_DIR)
    .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'));
  
  console.log(`Found ${files.length} test images.`);
  
  const results: Array<{
    filename: string;
    expected: string;
    identified: string;
    match: boolean;
    useLocation: boolean;
  }> = [];
  
  // Process each file
  for (const filename of files) {
    // Extract expected landmark ID from filename (e.g., "hoover-tower-1.jpg" -> "hoover-tower")
    const expectedId = filename.split('-').slice(0, -1).join('-').replace(/\.(jpg|jpeg|png)$/, '');
    
    // Skip if the landmark ID doesn't match any known landmarks
    const landmarkExists = STANFORD_LANDMARKS.some(l => l.id === expectedId);
    if (!landmarkExists) {
      console.log(`Unknown landmark ID in filename: ${expectedId}`);
      continue;
    }
    
    console.log(`\n--- Testing ${filename} for landmark: ${expectedId} ---`);
    
    const imagePath = path.join(TEST_IMAGES_DIR, filename);
    
    // Process the image to match frontend processing
    const base64Data = await processImageForVLM(imagePath);
    
    // Get appropriate GPS coordinates for this test
    const gps = getTestGpsCoordinates(expectedId);
    const useLocation = !!gps;
    
    if (gps) {
      console.log(`Using GPS coordinates: ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`);
    } else {
      console.log("No GPS coordinates provided for this test");
    }
    
    const startTime = Date.now();
    const identifyResult = await identifyLandmark(base64Data, gps);
    const endTime = Date.now();
    
    console.log(`Identification time: ${((endTime - startTime) / 1000).toFixed(3)}s`);
    
    if (!identifyResult.label) {
      console.log(`Result: Not identified`);
      results.push({
        filename,
        expected: expectedId,
        identified: "Not identified",
        match: false,
        useLocation
      });
      continue;
    }
    
    console.log(`Result: ${identifyResult.label}`);
    
    // Check for a match between the identified name and the expected ID
    const identifiedLabel = identifyResult.label.toLowerCase();
    
    // Try different matching strategies:
    // 1. Direct ID match
    // 2. ID derived from name
    // 3. Name contains ID or vice versa (partial match)
    const identifiedId = nameToId[identifiedLabel] || '';
    const isMatch = 
      identifiedId === expectedId || 
      identifiedLabel.includes(expectedId) || 
      expectedId.includes(identifiedLabel.replace(/\s+/g, '-'));
    
    results.push({
      filename,
      expected: expectedId,
      identified: identifyResult.label,
      match: isMatch,
      useLocation
    });
  }
  
  // Print results in a formatted table
  console.log("\n--- TEST SUMMARY ---");
  console.log("=========================================================================");
  console.log("| Image                     | Expected          | Identified        | GPS | Match |");
  console.log("=========================================================================");
  
  for (const result of results) {
    console.log(`| ${result.filename.padEnd(25)} | ${result.expected.padEnd(18)} | ${result.identified.padEnd(18)} | ${result.useLocation ? "✓" : "✗"}   | ${result.match ? "✓" : "✗"}    |`);
  }
  
  console.log("=========================================================================");
  
  const matchCount = results.filter(r => r.match).length;
  const accuracy = (matchCount / results.length) * 100;
  console.log(`Overall accuracy: ${matchCount}/${results.length} (${Math.round(accuracy)}%)`);
  
  // Print all available landmarks for reference
  console.log("\n--- AVAILABLE LANDMARKS ---");
  console.log("The following landmarks are defined in the system:");
  STANFORD_LANDMARKS.forEach(landmark => {
    console.log(`- ${landmark.id} (${landmark.name})`);
  });
}

// Run the tests
runTests().catch(error => {
  console.error("Test error:", error);
  process.exit(1);
}); 