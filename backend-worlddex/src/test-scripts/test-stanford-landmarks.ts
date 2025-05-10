import 'dotenv/config';
import fs from "fs";
import path from "path";
import { identifyLandmark } from "../services/stanfordService";

// Debug check for API keys
const openaiKey = process.env.OPENAI_API_KEY || '';
console.log("OpenAI API Key available:", openaiKey ? "Yes" : "No");

// Define test landmarks and their coordinates
const HOOVER_TOWER_GPS = { lat: 37.427467, lng: -122.166962 };
const MEMORIAL_CHURCH_GPS = { lat: 37.426751, lng: -122.170054 };
const OUTSIDE_GPS = { lat: 37.4320, lng: -122.1750 }; // Far from both landmarks

async function testStanfordLandmarks() {
  try {
    console.log("Starting Stanford Landmark Identification Tests...");
    
    // Test with Hoover Tower Image
    const hooverImagePath = path.join(__dirname, "../../test-images/hootow.jpeg");
    const hooverImageBuffer = fs.readFileSync(hooverImagePath);
    const hooverBase64 = hooverImageBuffer.toString("base64");
    console.log(`Loaded Hoover Tower image (${hooverImageBuffer.length} bytes)`);
    
    // Test with Memorial Church Image
    const memchuImagePath = path.join(__dirname, "../../test-images/memchu.jpeg");
    const memchuImageBuffer = fs.readFileSync(memchuImagePath);
    const memchuBase64 = memchuImageBuffer.toString("base64");
    console.log(`Loaded Memorial Church image (${memchuImageBuffer.length} bytes)`);
    
    // Run test cases
    
    // Test Case 1: Hoover Tower image with coordinates near Hoover Tower
    console.log("\n--- TEST CASE 1: Hoover Tower image & Near Hoover Tower ---");
    console.time("Test 1 Time");
    const hooverNearHooverResult = await identifyLandmark(hooverBase64, HOOVER_TOWER_GPS);
    console.timeEnd("Test 1 Time");
    console.log("Result:", hooverNearHooverResult);
    
    // Test Case 2: Hoover Tower image with coordinates near Memorial Church
    console.log("\n--- TEST CASE 2: Hoover Tower image & Near Memorial Church ---");
    console.time("Test 2 Time");
    const hooverNearMemchuResult = await identifyLandmark(hooverBase64, MEMORIAL_CHURCH_GPS);
    console.timeEnd("Test 2 Time");
    console.log("Result:", hooverNearMemchuResult);
    
    // Test Case 3: Hoover Tower image with coordinates far from both
    console.log("\n--- TEST CASE 3: Hoover Tower image & Far from both ---");
    console.time("Test 3 Time");
    const hooverFarResult = await identifyLandmark(hooverBase64, OUTSIDE_GPS);
    console.timeEnd("Test 3 Time");
    console.log("Result:", hooverFarResult);
    
    // Test Case 4: Memorial Church image with coordinates near Memorial Church
    console.log("\n--- TEST CASE 4: Memorial Church image & Near Memorial Church ---");
    console.time("Test 4 Time");
    const memchuNearMemchuResult = await identifyLandmark(memchuBase64, MEMORIAL_CHURCH_GPS);
    console.timeEnd("Test 4 Time");
    console.log("Result:", memchuNearMemchuResult);
    
    // Test Case 5: Memorial Church image with coordinates near Hoover Tower
    console.log("\n--- TEST CASE 5: Memorial Church image & Near Hoover Tower ---");
    console.time("Test 5 Time");
    const memchuNearHooverResult = await identifyLandmark(memchuBase64, HOOVER_TOWER_GPS);
    console.timeEnd("Test 5 Time");
    console.log("Result:", memchuNearHooverResult);
    
    // Test Case 6: Memorial Church image with coordinates far from both
    console.log("\n--- TEST CASE 6: Memorial Church image & Far from both ---");
    console.time("Test 6 Time");
    const memchuFarResult = await identifyLandmark(memchuBase64, OUTSIDE_GPS);
    console.timeEnd("Test 6 Time");
    console.log("Result:", memchuFarResult);
    
    // Print summary table
    console.log("\n--- TEST SUMMARY ---");
    console.log("=====================================================================");
    console.log("| Test Case                           | Result                      |");
    console.log("=====================================================================");
    console.log(`| Hoover Tower img & Near Hoover      | ${hooverNearHooverResult.label || "Unknown"} |`);
    console.log(`| Hoover Tower img & Near MemChu      | ${hooverNearMemchuResult.label || "Unknown"} |`);
    console.log(`| Hoover Tower img & Far from both    | ${hooverFarResult.label || "Unknown"} |`);
    console.log(`| Memorial Church img & Near MemChu   | ${memchuNearMemchuResult.label || "Unknown"} |`);
    console.log(`| Memorial Church img & Near Hoover   | ${memchuNearHooverResult.label || "Unknown"} |`);
    console.log(`| Memorial Church img & Far from both | ${memchuFarResult.label || "Unknown"} |`);
    console.log("=====================================================================");
    
  } catch (error) {
    console.error("Error in Stanford landmarks test:", error);
  }
}

// Run the test
testStanfordLandmarks().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
}); 