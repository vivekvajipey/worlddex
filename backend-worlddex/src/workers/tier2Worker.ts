import { Worker } from "bullmq";
import { connection } from "../services/jobQueue";
// import { identifySpecies } from "../services/speciesService"; // Deprecated
import { identifyPlant } from "../services/plantService";
import { identifyLandmark } from "../services/stanfordService";

console.log("Starting Tier2 Worker...");

const worker = new Worker("tier2", async job => {
  console.log(`[Worker] Processing job ${job.id} of type ${job.name}`);
  console.log(`[Worker] Job data:`, JSON.stringify({
    module: job.data.module,
    hasBase64: !!job.data.base64Data,
    hasGps: !!job.data.gps
  }));
  
  const { base64Data, module, gps } = job.data;
  
  try {
    // Use plantService instead of speciesService for plant identification
    if (module === "species") {
      console.log("[Worker] Identifying plant...");
      const result = await identifyPlant(base64Data);
      console.log(`[Worker] Plant identification complete: ${result.label}`);
      return result;
    }
    
    if (module === "landmark") {
      console.log("[Worker] Identifying landmark...");
      const result = await identifyLandmark(base64Data, gps);
      console.log(`[Worker] Landmark identification complete: ${result.label}`);
      return result;
    }
    
    throw new Error("Unknown module");
  } catch (error) {
    console.error(`[Worker] Error processing job:`, error);
    throw error;
  }
}, { connection });

console.log("Tier2 Worker successfully started and waiting for jobs...");

// Add event listeners for better debugging
worker.on('completed', job => {
  console.log(`[Worker] Job ${job.id} has completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} has failed with error ${err.message}`);
});

worker.on('error', err => {
  console.error('[Worker] Error in worker:', err);
});

// Keep the process alive
process.on('SIGTERM', async () => {
  await worker.close();
});