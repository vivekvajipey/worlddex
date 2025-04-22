import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL!);

export interface Tier2JobData {
  base64Data: string;
  module: "species" | "landmark";
  gps?: { lat: number; lng: number } | null;
}

export const tier2Queue = new Queue<Tier2JobData>("tier2", { connection });
// QueueScheduler is deprecated in v2+, not needed in newer versions
// For delayed jobs functionality in v5+