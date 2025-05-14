import fs from "fs";
import path from "path";
import { identifyPlant } from "../services/plantService";
import { Tier2Result } from "../../shared/types/identify";
import dotenv from "dotenv";

// Load environment variables from .env file
// Make sure to load dotenv as early as possible
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Debug check for API key
console.log("API Key available:", process.env.PLANT_ID_API_KEY ? "Yes" : "No");

async function testPlantIdentification(): Promise<Tier2Result | null> {
  try {
    // Path to a test image
    const testImagePath = path.join(__dirname, "../../test-images/test-plant.jpg");
    
    if (!fs.existsSync(testImagePath)) {
      console.error("Test image not found at path:", testImagePath);
      return null;
    }
    
    // Read the image file and convert to base64
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Data = imageBuffer.toString("base64");
    
    console.log("Starting plant identification test...");
    console.log("Image loaded, size:", imageBuffer.length, "bytes");
    
    // Call the identifyPlant function with a longer timeout
    console.time("API Request Time");
    
    try {
      const result = await identifyPlant(base64Data);
      console.timeEnd("API Request Time");
      
      console.log("Identification result:");
      console.log(JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.timeEnd("API Request Time");
      throw error;
    }
  } catch (error) {
    console.error("Error in plant identification test:");
    console.error(error);
    throw error;
  }
}

// Set a longer timeout for Node.js
const originalTimeout = setTimeout;
const timeoutDuration = 30000; // 30 seconds
process.env.NODE_OPTIONS = `--max-http-header-size=16384 --no-warnings`;

// Run the test
console.log("Running plant identification test with a timeout of", timeoutDuration/1000, "seconds");
const testPromise = testPlantIdentification();

// Add a timeout in case the API takes too long
const timeoutPromise = new Promise<Tier2Result | null>((_, reject) => {
  setTimeout(() => reject(new Error("Plant identification test timed out")), timeoutDuration);
});

Promise.race([testPromise, timeoutPromise])
  .then(result => {
    if (result) {
      console.log("Test completed successfully!");
      console.log("Identified plant:", result.label);
      console.log("Confidence:", result.confidence);
      console.log("Provider:", result.provider);
    } else {
      console.log("Test completed with no result.");
    }
  })
  .catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
  }); 