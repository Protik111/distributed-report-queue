import express from "express";
import cors from "cors";
import { Queue, Job } from "bullmq";
import dotenv from "dotenv";

// Force Docker service name before any imports
process.env.REDIS_HOST = "redis";
process.env.REDIS_PORT = "6379";

import { redisConnection } from "./lib/redis";

dotenv.config();

const app = express();
const PORT = Number(process.env.DASHBOARD_PORT) || 5003;

const REPORT_QUEUE = "report-queue"; // Match your queue name (no colons!)

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", async (_req, res) => {
  const redisOk = await redisConnection
    .ping()
    .then(() => true)
    .catch(() => false);
  res.json({
    status: redisOk ? "healthy" : "unhealthy",
    service: "dashboard-api",
    timestamp: Date.now(),
  });
});

// Queue stats
app.get("/api/stats", async (_req, res) => {
  try {
    const queue = new Queue(REPORT_QUEUE, { connection: redisConnection });

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    await queue.close();

    res.json({
      queue: REPORT_QUEUE,
      counts: { waiting, active, completed, failed, delayed },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Job details by ID
app.get("/api/jobs/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get result stored by worker
    const resultRaw = await redisConnection.get(`job:result:${jobId}`);
    const result = resultRaw ? JSON.parse(resultRaw) : null;

    // Try to get job metadata
    const queue = new Queue(REPORT_QUEUE, { connection: redisConnection });
    const job = await queue.getJob(jobId);
    await queue.close();

    if (!job && !result) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      id: jobId,
      status: job
        ? await job.getState()
        : result?.success
          ? "completed"
          : "unknown",
      progress: job?.progress || result ? 100 : 0,
      result,
      jobData: job?.data,
      attempts: job?.attemptsMade,
      timestamp: job?.timestamp || result?.processedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Failed jobs (Dead Letter Queue)
app.get("/api/jobs/failed", async (_req, res) => {
  try {
    const queue = new Queue(REPORT_QUEUE, { connection: redisConnection });
    const failedJobs = await queue.getFailed(0, 50);

    const jobs = await Promise.all(
      failedJobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        finishedOn: job.finishedOn,
        attempts: job.attemptsMade,
        errorDetails: JSON.parse(
          (await redisConnection.get(`job:error:${job.id}`)) || "null",
        ),
      })),
    );

    await queue.close();

    res.json({
      jobs,
      total: await queue.getFailedCount(),
      page: 0,
      limit: 50,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Active workers
app.get("/api/workers", async (_req, res) => {
  try {
    const keys = await redisConnection.keys("worker:heartbeat:*");
    const workers = [];

    for (const key of keys) {
      const data = await redisConnection.get(key);
      if (data) {
        const workerId = key.split(":").pop();
        workers.push({ id: workerId, ...JSON.parse(data) });
      }
    }

    res.json({
      workers,
      count: workers.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`📊 Dashboard API running on port ${PORT}`);
});
