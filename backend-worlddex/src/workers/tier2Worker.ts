import { Worker } from "bullmq";
import { connection } from "../services/jobQueue";
import { identifySpecies } from "../services/speciesService";
import { identifyLandmark } from "../services/stanfordService";

new Worker("tier2", async job => {
  const { base64Data, module, gps } = job.data;
  if (module === "species") return await identifySpecies(base64Data);
  if (module === "landmark") return await identifyLandmark(base64Data);
  throw new Error("Unknown module");
}, { connection });