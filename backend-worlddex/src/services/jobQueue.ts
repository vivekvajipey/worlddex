import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl =
  process.env.REDIS_URL           // Fly / prod
  || "redis://127.0.0.1:6379";    // local docker-compose etc.

// Log the Redis connection attempt for debugging
console.log(`Attempting to connect to Redis at: ${redisUrl}`);

// Configure Redis connection with maxRetriesPerRequest: null as required by BullMQ
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  // Add more retries to handle initial connectivity issues
  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000);
    console.log(`Redis connection attempt ${times} failed, retrying in ${delay}ms`);
    return delay;
  }
});

export interface Tier2JobData {
  base64Data: string;
  module: "species" | "landmark";
  gps?: { lat: number; lng: number } | null;
}

export const tier2Queue = new Queue<Tier2JobData>("tier2", { connection });
// QueueScheduler is deprecated in v2+, not needed in newer versions
// For delayed jobs functionality in v5+