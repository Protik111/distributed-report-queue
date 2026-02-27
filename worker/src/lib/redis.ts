import IORedis from "ioredis";

interface RedisConfig {
  host: string;
  port: number;
}

const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

export const redisConnection = new IORedis({
  ...redisConfig,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    if (times > 10) {
      return null; // Stop retrying
    }
    return Math.min(times * 100, 3000);
  },
});

redisConnection.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redisConnection.on("connect", () => {
  console.log("Connected to Redis");
});

redisConnection.on("close", () => {
  console.warn("Redis connection closed");
});

export default redisConnection;
