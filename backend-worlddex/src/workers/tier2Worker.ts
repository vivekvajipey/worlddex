import { Worker } from "bullmq";
import { connection } from "../services/jobQueue";
// import { identifySpecies } from "../services/speciesService"; // Deprecated
import { identifyPlant } from "../services/plantService";
import { identifyLandmark } from "../services/stanfordService";

new Worker("tier2", async job => {
  const { base64Data, module, gps } = job.data;
  
  // Use plantService instead of speciesService for plant identification
  if (module === "species") return await identifyPlant(base64Data);
  if (module === "landmark") return await identifyLandmark(base64Data, gps);
  
  throw new Error("Unknown module");
}, { connection });