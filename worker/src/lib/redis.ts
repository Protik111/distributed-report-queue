// worker/src/lib/redis.ts
import IORedis from "ioredis";

// Support both REDIS_URL and separate HOST/PORT
const redisConfig = process.env.REDIS_URL
  ? { url: process.env.REDIS_URL }
  : {
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: Number(process.env.REDIS_DB) || 0,
    };

export const redisConnection = new IORedis({
  ...redisConfig,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    if (times > 10) return null;
    return Math.min(times * 100, 3000);
  },
});

redisConnection.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redisConnection.on("connect", () => {
  console.log("Connected to Redis");
});

export default redisConnection;
