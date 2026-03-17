// dashboard-api/src/lib/redis.ts
import IORedis from "ioredis";

// For LOCAL TESTING (running on laptop), NOT Docker
const isDocker =
  process.env.NODE_ENV === "production" || process.env.REDIS_HOST === "redis";

export const redisConnection = new IORedis({
  host: isDocker ? "redis" : "localhost", // ← LOCALHOST for dev!
  port: 6379,
  family: 4,
  maxRetriesPerRequest: null,
});

redisConnection.on("connect", () =>
  console.log("Dashboard API connected to Redis"),
);
redisConnection.on("error", (err) =>
  console.error("Redis error:", err.message),
);
redisConnection.on("reconnecting", () => {
  console.log("Retrying Redis connection...");
});

export default redisConnection;
