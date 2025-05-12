import { Worker, Job } from "bullmq";
import { connection, Tier2JobData } from "../services/jobQueue";
// import { identifySpecies } from "../services/speciesService"; // Deprecated
import { identifyPlant } from "../services/plantService";
import { identifyLandmark } from "../services/stanfordService";
import { Tier2Result } from "../../../shared/types/identify";

console.log("Starting Tier2 Worker...");

// Create a completely rewritten worker with better job lifecycle handling
const worker = new Worker<Tier2JobData, Tier2Result, string>(
  "tier2", 
  async (job) => {
    console.log(`[Worker] Processing job ${job.id} of type ${job.name}`);
    console.log(`[Worker] Job data:`, JSON.stringify({
      module: job.data.module,
      hasBase64: !!job.data.base64Data,
      hasGps: !!job.data.gps
    }));
    
    const { base64Data, module, gps } = job.data;
    
    // Add progress updates for better tracking
    await job.updateProgress(10);
    
    try {
      let result: Tier2Result;
      
      // Use plantService instead of speciesService for plant identification
      if (module === "plants") {
        console.log("[Worker] Identifying plant...");
        await job.updateProgress(30);
        
        const plantResult = await identifyPlant(base64Data);
        await job.updateProgress(80);
        
        console.log(`[Worker] Plant identification complete: ${plantResult.label}`);
        result = {
          label: plantResult.label,
          provider: "plant.id", 
          confidence: plantResult.confidence
        };
      } else if (module === "stanford") {
        console.log("[Worker] Identifying Stanford landmark...");
        await job.updateProgress(30);
        
        const landmarkResult = await identifyLandmark(base64Data, gps);
        await job.updateProgress(80);
        
        console.log(`[Worker] Stanford landmark identification complete: ${landmarkResult.label}`);
        result = landmarkResult;
      } else {
        throw new Error(`Unknown module: ${module}`);
      }
      
      // Final progress update
      await job.updateProgress(100);
      
      // Important: Log the actual return value
      console.log(`[Worker] Job ${job.id} result:`, JSON.stringify(result));
      
      // Make sure we're returning a result with the proper structure
      if (!result || !result.label) {
        console.error(`[Worker] Invalid result format:`, result);
        throw new Error("Invalid identification result format");
      }
      
      return result;
    } catch (error) {
      console.error(`[Worker] Error processing job:`, error);
      throw error;
    }
  }, 
  { 
    connection,
    autorun: true,
    // Advanced settings to ensure results are properly saved
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 1000 },
    lockDuration: 30000,
  }
);

console.log("Tier2 Worker successfully started and waiting for jobs...");

// Add event listeners for better debugging
worker.on('completed', (job: Job, result: any) => {
  console.log(`[Worker] Job ${job.id} has completed successfully`);
  console.log(`[Worker] Final result:`, JSON.stringify(result));
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[Worker] Job ${job?.id} has failed with error ${err.message}`);
});

worker.on('error', (err: Error) => {
  console.error('[Worker] Error in worker:', err);
});

// Keep the process alive
process.on('SIGTERM', async () => {
  await worker.close();
});