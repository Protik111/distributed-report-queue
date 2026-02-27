// Helper (Health check server)

import express, { Request, Response } from "express";
import redisConnection from "./lib/redis";
import logger from "./utils/logger";

const healthApp = express();
const PORT = Number(process.env.PORT) || 5002;

healthApp.get("/health", async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Check Redis connection
    const redisOk = await redisConnection
      .ping()
      .then(() => true)
      .catch(() => false);

    const healthStatus = {
      status: redisOk ? "healthy" : "unhealthy",
      service: "worker",
      version: process.env.npm_package_version || "1.0.0",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      redis: redisOk ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    };

    res.status(redisOk ? 200 : 503).json(healthStatus);
  } catch (error: any) {
    logger.error({ error: error.message }, "Health check failed");
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

healthApp.get("/ready", async (_req: Request, res: Response) => {
  // Kubernetes readiness probe
  const redisOk = await redisConnection
    .ping()
    .then(() => true)
    .catch(() => false);
  res.status(redisOk ? 200 : 503).json({ ready: redisOk });
});

export function startHealthServer(): Promise<void> {
  return new Promise((resolve) => {
    healthApp.listen(PORT, () => {
      logger.info({ port: PORT }, "🏥 Health server started");
      resolve();
    });
  });
}
