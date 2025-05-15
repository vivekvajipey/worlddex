import 'dotenv/config';
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { identifyAnimal } from "../services/animalIdentificationService";

// Check for API keys
const openaiKey = process.env.OPENAI_API_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';
console.log("OpenAI API Key available:", openaiKey ? "Yes" : "No");
console.log("Gemini API Key available:", geminiKey ? "Yes" : "No");

// Constants for image processing
const MAX_IMAGE_DIMENSION = 1024;
const IMAGE_COMPRESSION_LEVEL = 0.8;

/**
 * Process an image for the VLM
 */
async function processImageForVLM(imagePath: string): Promise<string> {
  try {
    // Get image metadata
    const metadata = await sharp(imagePath).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;
    
    // Calculate resize dimensions
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
    return fs.readFileSync(imagePath, { encoding: 'base64' });
  }
}

/**
 * Test the updated animal identification service
 */
async function testAnimalIdentification() {
  console.log("\n=== TESTING UPDATED ANIMAL IDENTIFICATION SERVICE ===\n");
  
  // Define test directories
  const testDirectories = [
    { dir: "birds", tier1Label: "bird" },
    { dir: "animals", tier1Label: "animal" }
  ];
  
  // Test each directory
  for (const { dir, tier1Label } of testDirectories) {
    const TEST_IMAGES_DIR = path.join(__dirname, `../../test-images/${dir}`);
    
    // Check if directory exists
    if (!fs.existsSync(TEST_IMAGES_DIR)) {
      console.log(`Test directory not found: ${TEST_IMAGES_DIR} - skipping this category`);
      continue;
    }
    
    // Get all image files
    const files = fs.readdirSync(TEST_IMAGES_DIR)
      .filter(file => file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png'));
    
    console.log(`\n===== Testing ${dir} Identification =====`);
    console.log(`Found ${files.length} test images in ${dir} directory`);
    
    if (files.length === 0) {
      console.log(`No images found in ${TEST_IMAGES_DIR}, skipping this category`);
      continue;
    }
    
    // Test each image
    for (const filename of files) {
      console.log(`\n--- Testing ${filename} ---`);
      
      const imagePath = path.join(TEST_IMAGES_DIR, filename);
      const base64Data = await processImageForVLM(imagePath);
      
      const startTime = Date.now();
      try {
        const result = await identifyAnimal(base64Data, tier1Label);
        const endTime = Date.now();
        
        console.log(`Identification time: ${((endTime - startTime) / 1000).toFixed(3)}s`);
        console.log(`Result: ${result.label || "Not identified"}`);
        console.log(`Provider: ${result.provider}`);
      } catch (error: any) {
        console.error(`Error during identification:`, error);
      }
    }
  }
}

// Run the test
testAnimalIdentification().catch(error => {
  console.error("Unexpected test error:", error);
  process.exit(1);
}); 