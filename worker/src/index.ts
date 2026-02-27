// ENTRY POINT #1 (Main Worker)

import { Worker, Job } from "bullmq";
import dotenv from "dotenv";
import {
  processReportJob,
  IReportJobData,
  IReportResult,
} from "./processors/report.processor";
import redisConnection from "./lib/redis";
import logger from "./utils/logger";
import { startHealthServer } from "./health";

dotenv.config();

const REPORT_QUEUE = "report:queue";
const GENERATE_REPORT_JOB = "generate:report";

const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "2");
const LOCK_DURATION = parseInt(process.env.WORKER_LOCK_DURATION || "300000");

async function startWorker() {
  await startHealthServer();

  const worker = new Worker<IReportJobData, IReportResult>(
    REPORT_QUEUE,
    async (job: Job<IReportJobData>) => {
      if (job.name === GENERATE_REPORT_JOB) {
        return await processReportJob(job);
      }
      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection: redisConnection,
      concurrency: CONCURRENCY,
      lockDuration: LOCK_DURATION,
      limiter: { max: 10, duration: 1000 },
    },
  );

  worker.on("completed", (job, result) => {
    logger.info({ jobId: job.id, success: result?.success }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, error: err.message, attempts: job?.attemptsMade },
      "Job failed",
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "🛑 Shutting down...");
    await worker.close();
    await redisConnection.quit();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  logger.info(
    { workerId: WORKER_ID, concurrency: CONCURRENCY },
    "🚀 Worker started",
  );
}

if (require.main === module) {
  startWorker().catch((err) => {
    logger.fatal({ err }, "Failed to start worker");
    process.exit(1);
  });
}
