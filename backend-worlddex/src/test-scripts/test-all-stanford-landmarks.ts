import 'dotenv/config';
import fs from "fs";
import path from "path";
import { identifyLandmark } from "../services/stanfordService";
import { getLandmarkCoordinates, STANFORD_LANDMARKS } from "../data/stanford-landmarks";

// Debug check for API keys
const openaiKey = process.env.OPENAI_API_KEY || '';
console.log("OpenAI API Key available:", openaiKey ? "Yes" : "No");

// Get a map of landmark IDs to coordinates
const LANDMARKS = getLandmarkCoordinates();

// Define some testing locations outside landmarks
const OUTSIDE_GPS = { lat: 37.4320, lng: -122.1750 }; // Location outside specific landmarks

// Check if images directory exists
const TEST_IMAGES_DIR = path.join(__dirname, "../../test-images/stanford");
if (!fs.existsSync(TEST_IMAGES_DIR)) {
  console.log(`Test images directory doesn't exist: ${TEST_IMAGES_DIR}`);
  console.log("Creating directory...");
  fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });
  console.log(`Created directory. Please add test images to ${TEST_IMAGES_DIR}`);
  console.log("Image naming convention: landmark-id-number.jpg (e.g., hoover-tower-1.jpg)");
  process.exit(0);
}

async function testLandmarkIdentification() {
  try {
    console.log("Starting Stanford Landmark Identification Tests...");
    
    // Get all image files from directory
    const imageFiles = fs.readdirSync(TEST_IMAGES_DIR)
      .filter(file => /\.(jpg|jpeg|png)$/i.test(file));
    
    if (imageFiles.length === 0) {
      console.error("No test images found in directory");
      console.log(`Please add images to ${TEST_IMAGES_DIR}`);
      console.log("Image naming convention: landmark-id-number.jpg (e.g., hoover-tower-1.jpg)");
      process.exit(1);
    }
    
    console.log(`Found ${imageFiles.length} test images.`);
    
    const results = [];
    
    for (const imageFile of imageFiles) {
      // Extract landmark name from filename (e.g., "hoover-tower-1.jpg" -> "hoover-tower")
      const landmarkMatch = imageFile.match(/^([a-z-]+)[-_]/);
      if (!landmarkMatch) {
        console.warn(`Skipping file with unrecognized naming pattern: ${imageFile}`);
        continue;
      }
      
      const landmarkId = landmarkMatch[1];
      const gps = LANDMARKS[landmarkId];
      
      if (!gps) {
        console.warn(`Unknown landmark ID in filename: ${landmarkId}`);
        continue;
      }
      
      console.log(`\n--- Testing ${imageFile} for landmark: ${landmarkId} ---`);
      const imagePath = path.join(TEST_IMAGES_DIR, imageFile);
      const imageBuffer = fs.readFileSync(imagePath);
      const base64 = imageBuffer.toString("base64");
      
      try {
        // Test with exact coordinates
        console.time("Identification time");
        const exactLocationResult = await identifyLandmark(base64, gps);
        console.timeEnd("Identification time");
        
        // Create results entry
        results.push({
          image: imageFile,
          expected: landmarkId,
          identified: exactLocationResult.label || "Unknown",
          match: exactLocationResult.label && 
                 exactLocationResult.label.toLowerCase().includes(landmarkId.replace(/-/g, " "))
        });
        
        console.log(`Result: ${exactLocationResult.label || "Unknown"}`);
      } catch (error) {
        console.error(`Error testing ${imageFile}:`, error);
        results.push({
          image: imageFile,
          expected: landmarkId,
          identified: "ERROR",
          match: false
        });
      }
    }
    
    // Print summary table
    console.log("\n--- TEST SUMMARY ---");
    console.log("==================================================================");
    console.log("| Image                     | Expected          | Identified        | Match |");
    console.log("==================================================================");
    
    let matches = 0;
    for (const result of results) {
      console.log(`| ${result.image.padEnd(25)} | ${result.expected.padEnd(18)} | ${(result.identified || "Unknown").padEnd(17)} | ${result.match ? "✓" : "✗"}    |`);
      if (result.match) matches++;
    }
    
    console.log("==================================================================");
    console.log(`Overall accuracy: ${matches}/${results.length} (${Math.round(matches/results.length*100)}%)`);
    
    // Print list of available landmarks for reference
    console.log("\n--- AVAILABLE LANDMARKS ---");
    console.log("The following landmarks are defined in the system:");
    STANFORD_LANDMARKS.forEach(landmark => {
      console.log(`- ${landmark.id} (${landmark.name})`);
    });
    
  } catch (error) {
    console.error("Error in Stanford landmarks test:", error);
  }
}

// Run the test
testLandmarkIdentification().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 