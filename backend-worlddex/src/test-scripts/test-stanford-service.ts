import 'dotenv/config';
import fs from "fs";
import path from "path";
import { identifyLandmark } from "../services/stanfordService";

// Debug check for API keys
const openaiKey = process.env.OPENAI_API_KEY || '';
console.log("OpenAI API Key available:", openaiKey ? "Yes" : "No");
console.log("OpenAI API Key (first 10 chars):", openaiKey.substring(0, 10) + "...");

async function testStanfordIdentification() {
  try {
    // Path to a test image (using the Claw image)
    const testImagePath = path.join(__dirname, "../../test-images/theclaw.jpeg");
    
    if (!fs.existsSync(testImagePath)) {
      console.error("Test image not found at path:", testImagePath);
      console.log("Please place a test image at:", testImagePath);
      return;
    }
    
    // Read the image file and convert to base64
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Data = imageBuffer.toString("base64");
    
    console.log("Starting Stanford landmark identification test...");
    console.log("Image loaded, size:", imageBuffer.length, "bytes");
    
    // Test cases
    
    // Test Case 1: No GPS coordinates - should consider all landmarks
    console.log("\n--- TEST CASE 1: No GPS ---");
    console.time("Test 1 Time");
    
    const result1 = await identifyLandmark(base64Data);
    
    console.timeEnd("Test 1 Time");
    console.log("Result (No GPS):", result1);
    
    // Test Case 2: GPS coordinates for "The Claw" - should be within radius
    console.log("\n--- TEST CASE 2: Within The Claw Radius ---");
    console.time("Test 2 Time");
    
    // GPS coordinates slightly off from the exact location but within radius
    const clawGps = { lat: 37.42520, lng: -122.16930 };
    const result2 = await identifyLandmark(base64Data, clawGps);
    
    console.timeEnd("Test 2 Time");
    console.log("Result (Within The Claw Radius):", result2);
    
    // Test Case 3: GPS coordinates outside the Claw's radius but still on campus
    console.log("\n--- TEST CASE 3: Outside The Claw Radius ---");
    console.time("Test 3 Time");
    
    // GPS coordinates outside the radius of The Claw (100m away)
    const outsideRadiusGps = { lat: 37.42430, lng: -122.16830 };
    const result3 = await identifyLandmark(base64Data, outsideRadiusGps);
    
    console.timeEnd("Test 3 Time");
    console.log("Result (Outside The Claw Radius):", result3);
    
    // Summary
    console.log("\n--- TEST SUMMARY ---");
    console.log("Test 1 (No GPS):", result1.label || "Unknown");
    console.log("Test 2 (Within The Claw Radius):", result2.label || "Unknown");
    console.log("Test 3 (Outside The Claw Radius):", result3.label || "Unknown");
    
  } catch (error) {
    console.error("Error in Stanford identification test:");
    console.error(error);
  }
}

// Run the test
testStanfordIdentification().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 