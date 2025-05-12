import 'dotenv/config';
import fs from "fs";
import path from "path";
import { PhotoService } from "../services/photoService";

const photoService = new PhotoService();

// Directory containing your silhouette and thumbnail images
const IMAGES_DIR = path.join(__dirname, "../../collection-images");

async function uploadCollectionImages() {
  if (!fs.existsSync(IMAGES_DIR)) {
    console.log(`Images directory not found: ${IMAGES_DIR}`);
    console.log("Creating directory...");
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log(`Created directory. Please add collection images to ${IMAGES_DIR}`);
    console.log("Image naming convention:");
    console.log("- landmark-id-silhouette.jpg/png - For silhouette images");
    console.log("- landmark-id-thumb.jpg/png - For thumbnail images");
    console.log("- stanford-collection-cover.jpg - For collection cover image");
    process.exit(0);
  }
  
  const files = fs.readdirSync(IMAGES_DIR);
  console.log(`Found ${files.length} files in directory.`);
  
  let uploadedCount = 0;
  let skippedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file);
    const stats = fs.statSync(filePath);
    
    if (!stats.isFile()) {
      console.log(`Skipping directory: ${file}`);
      skippedCount++;
      continue;
    }
    
    // Only process image files
    if (!/\.(jpg|jpeg|png)$/i.test(file)) {
      console.log(`Skipping non-image file: ${file}`);
      skippedCount++;
      continue;
    }
    
    try {
      console.log(`Processing file: ${file}`);
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString("base64");
      
      // Determine content type based on extension
      let contentType = "image/jpeg";
      if (file.toLowerCase().endsWith(".png")) {
        contentType = "image/png";
      }
      
      // Upload to S3
      const result = await photoService.uploadPhoto({
        base64Data,
        fileName: file,
        contentType
      });
      
      console.log(`Uploaded ${file} successfully!`);
      console.log(`File key: ${result.key}`);
      console.log(`Thumbnail key: ${result.thumbKey}`);
      
      // Determine if this is a silhouette, thumbnail, or cover
      let fileType = "unknown";
      if (file.includes("-silhouette")) {
        fileType = "silhouette";
      } else if (file.includes("-thumb")) {
        fileType = "thumbnail";
      } else if (file.includes("collection-cover")) {
        fileType = "cover";
      }
      
      console.log(`File type: ${fileType}`);
      console.log("-".repeat(50));
      
      uploadedCount++;
    } catch (error) {
      console.error(`Error uploading ${file}:`, error);
    }
  }
  
  console.log("\nUpload Summary:");
  console.log(`- Total Files: ${files.length}`);
  console.log(`- Uploaded: ${uploadedCount}`);
  console.log(`- Skipped: ${skippedCount}`);
  console.log("\nNext Steps:");
  console.log("1. Make sure the keys in src/data/stanford-landmarks.ts match the uploaded keys.");
  console.log("2. Run the create-stanford-collection.ts script to create the collection.");
  console.log("\nUpload process complete!");
}

uploadCollectionImages().catch(error => {
  console.error("Unhandled error:", error);
}); 