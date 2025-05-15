import { Queue } from "bullmq";
import IORedis from "ioredis";

// Configure Redis connection with maxRetriesPerRequest: null as required by BullMQ
export const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  family: 6
});

export interface Tier2JobData {
  base64Data: string;
  module: "plants" | "stanford" | "animals";
  gps?: { lat: number; lng: number } | null;
  tier1Label?: string;
}

export const tier2Queue = new Queue<Tier2JobData>("tier2", { connection });
// QueueScheduler is deprecated in v2+, not needed in newer versions
// For delayed jobs functionality in v5+