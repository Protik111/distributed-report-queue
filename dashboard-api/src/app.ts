import express from "express";
import cors from "cors";
import { Queue } from "bullmq";
import dotenv from "dotenv";

process.env.REDIS_HOST = "redis";
process.env.REDIS_PORT = "6379";

import { redisConnection } from "./lib/redis";

dotenv.config();

const app = express();
const PORT = Number(process.env.DASHBOARD_PORT) || 5003;
const REPORT_QUEUE_NAME = "report-queue";

app.use(cors());
app.use(express.json());

// Health Check
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

// Stats - Use custom tracking instead of BullMQ counts
app.get("/api/stats", async (_req, res) => {
  try {
    // Count actual jobs in custom storage
    const resultKeys = await redisConnection.keys("job:result:*");
    const errorKeys = await redisConnection.keys("job:error:*");

    res.json({
      queue: REPORT_QUEUE_NAME,
      counts: {
        waiting: 0,
        active: 0,
        completed: resultKeys.length,
        failed: errorKeys.length,
        delayed: 0,
      },
      totalJobs: resultKeys.length + errorKeys.length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Stats error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ENDPOINT FOR COMPLETED JOBS
app.get("/api/jobs/completed", async (_req, res) => {
  try {
    const jobResultKeys = await redisConnection.keys("job:result:*");
    
    const jobs = [];

    for (const key of jobResultKeys) {
      const resultRaw = await redisConnection.get(key);
      if (resultRaw) {
        const resultData = JSON.parse(resultRaw);
        const jobId = key.split(":").pop();

        jobs.push({
          id: jobId || "",
          name: "generate-report",
          success: resultData.success,
          reportUrl: resultData.reportUrl,
          fileName: resultData.fileName,
          fileSize: resultData.fileSize,
          processedAt: resultData.processedAt || Date.now(),
        });
      }
    }

    // Sort by processedAt descending
    jobs.sort((a, b) => b.processedAt - a.processedAt);

    res.json({
      jobs,
      total: jobs.length,
      page: 0,
      limit: jobs.length || 0,
    });
  } catch (error: any) {
    console.error("Completed jobs ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// FAILED JOBS ENDPOINT
app.get("/api/jobs/failed", async (_req, res) => {
  try {
    // DO NOT TOUCH ANY BULLMQ KEYS DIRECTLY!
    // Just return empty array - all your jobs have succeeded!

    console.log("DEBUG: Checking for failed jobs...");

    const jobErrorKeys = await redisConnection.keys("job:error:*");
    console.log(`Found ${jobErrorKeys.length} job error keys`);

    const jobs = [];

    for (const key of jobErrorKeys) {
      const errorRaw = await redisConnection.get(key);
      if (errorRaw) {
        const errorData = JSON.parse(errorRaw);
        const jobId = key.split(":").pop();

        jobs.push({
          id: jobId || "",
          name: "generate-report",
          failedReason: errorData.error || "Unknown error",
          finishedOn: errorData.timestamp || Date.now(),
          attempts: errorData.attempts || 3,
        });
      }
    }

    res.json({
      jobs,
      total: jobs.length,
      page: 0,
      limit: jobs.length || 0,
    });
  } catch (error: any) {
    console.error("Failed jobs ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Job Details by ID
app.get("/api/jobs/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;

    const resultRaw = await redisConnection.get(`job:result:${jobId}`);
    const result = resultRaw ? JSON.parse(resultRaw) : null;

    const queue = new Queue(REPORT_QUEUE_NAME, { connection: redisConnection });
    const job = await queue.getJob(jobId);
    await queue.close();

    res.json({
      id: jobId,
      status: result?.success ? "completed" : "unknown",
      progress: 100,
      result,
      jobData: job?.data || null,
      attempts: result?.attempts || 0,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Workers - (Handle empty case gracefully)
app.get("/api/workers", async (_req, res) => {
  try {
    const keys = await redisConnection.keys("worker:heartbeat:*");
    const workers = [];

    for (const key of keys) {
      try {
        const data = await redisConnection.get(key);
        if (data) {
          workers.push(JSON.parse(data));
        }
      } catch {}
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
  console.log(`Dashboard API running on port ${PORT}`);
});
