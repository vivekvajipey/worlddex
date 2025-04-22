import fs from 'fs';
import path from 'path';
import { identifySpecies } from '../services/speciesService';

async function testSpeciesIdentification() {
  try {
    // Path to a test image - pointing to the correct location
    const testImagePath = path.join(__dirname, '../../test-images/test-plant.jpg');
    
    // Read the image file and convert to base64
    const imageBuffer = fs.readFileSync(testImagePath);
    const base64Data = imageBuffer.toString('base64');
    
    console.log('Starting species identification test...');
    console.log('Image loaded, size:', imageBuffer.length, 'bytes');
    
    // Call the identifySpecies function
    const result = await identifySpecies(base64Data);
    
    console.log('Identification result:');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('Error in species identification test:');
    console.error(error);
    throw error;
  }
}

// Run the test
testSpeciesIdentification()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err)); 