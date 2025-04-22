import fs from 'fs';
import path from 'path';
import { identifyPlant } from '../services/plantService';

// Set API key directly for testing if not already in environment
// In production, this should be set in the environment or secrets management
if (!process.env.PLANT_ID_API_KEY && process.env.NODE_ENV !== 'production') {
  process.env.PLANT_ID_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual API key for testing
}

async function testPlantIdentification() {
  try {
    // Path to a test image
    const testImagePath = path.join(__dirname, '../../test-images/test-plant.jpg');
    
    // Read the image file and convert to base64
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Data = imageBuffer.toString('base64');
    
    console.log('Starting plant identification test...');
    console.log('Image loaded, size:', imageBuffer.length, 'bytes');
    
    // Call the identifyPlant function
    const result = await identifyPlant(base64Data);
    
    console.log('Identification result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Error in plant identification test:');
    console.error(error);
    throw error;
  }
}

// Run the test
testPlantIdentification()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err)); 