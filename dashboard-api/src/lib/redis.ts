import IORedis from "ioredis";

export const redisConnection = new IORedis({
  host: "redis", // MUST be docker service name
  port: 6379, // Standard Redis port
  family: 4, // Force IPv4 (avoids ::1 errors)
  maxRetriesPerRequest: null, // Critical for BullMQ
});

redisConnection.on("connect", () =>
  console.log("Dashboard API connected to Redis"),
);
redisConnection.on("error", (err) => {
  console.error("Dashboard API Redis error:", err.message);
});

redisConnection.on("reconnecting", () => {
  console.log("Retrying Redis connection...");
});

export default redisConnection;
