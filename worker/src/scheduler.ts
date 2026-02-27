import { JobScheduler } from "bullmq";
import { redisConnection } from "./lib/redis";
import logger from "./utils/logger";

const REPORT_QUEUE = "report:queue";

export async function startScheduler() {
  logger.info("Starting Queue Scheduler...");

  const scheduler = new JobScheduler(REPORT_QUEUE, {
    connection: redisConnection,
  });

  scheduler.on("stalled", (jobId) => {
    logger.warn({ jobId }, "Job stalled (worker crashed). Requeueing...");
  });

  scheduler.on("error", (err) => {
    logger.error({ err }, "Scheduler error");
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Scheduler shutting down...");
    await scheduler.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("Scheduler shutting down...");
    await scheduler.close();
    process.exit(0);
  });
}

// Start if run directly
if (require.main === module) {
  startScheduler().catch((err) => {
    logger.fatal({ err }, "Failed to start scheduler");
    process.exit(1);
  });
}
