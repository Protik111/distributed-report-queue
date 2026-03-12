// worker/src/lib/redis.ts
import IORedis from "ioredis";

// Use explicit host/port (more reliable than URL parsing)
const redisConfig = {
  host: process.env.REDIS_HOST || "redis", // Default to 'redis' for Docker
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0"),
  family: 4, // Force IPv4 to avoid ::1 (IPv6 localhost) issues
};

console.log(`Connecting to Redis: ${redisConfig.host}:${redisConfig.port}`);

export const redisConnection = new IORedis({
  ...redisConfig,
  maxRetriesPerRequest: null, // ← CRITICAL for BullMQ
  enableReadyCheck: false, // ← Recommended for BullMQ
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error("Failed to connect to Redis after 10 attempts");
      return null;
    }
    const delay = Math.min(times * 100, 3000);
    console.log(`Retrying Redis connection in ${delay}ms...`);
    return delay;
  },
});

redisConnection.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redisConnection.on("connect", () => {
  console.log("Connected to Redis");
});

redisConnection.on("ready", () => {
  console.log("Redis connection ready");
});

export default redisConnection;
