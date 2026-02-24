import dotenv from "dotenv";
import path from "path";

dotenv.config();

export default {
  port: process.env.PORT || "5000",
  redisUrl:
    process.env.REDIS_URL ||
    (process.env.NODE_ENV === "production"
      ? "redis://redis:6379"
      : "redis://localhost:6379"),
};
