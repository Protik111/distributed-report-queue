import dotenv from "dotenv";

dotenv.config();

export default {
  port: process.env.PORT || "5000",
  redisUrl:
    process.env.REDIS_URL ||
    (process.env.NODE_ENV === "production"
      ? "redis://redis:6379"
      : "redis://localhost:6379"),
};
