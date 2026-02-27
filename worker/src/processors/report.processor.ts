import { Job } from "bullmq";
import puppeteer, { Browser } from "puppeteer";
import fs from "fs";
import path from "path";
import logger from "../utils/logger";
import redisConnection from "../lib/redis";

export interface IReportJobData {
  reportType: string;
  data: Record<string, any>;
  userId?: string;
}

export interface IReportResult {
  success: boolean;
  reportUrl?: string;
  fileName?: string;
  fileSize?: number;
  processedAt: number;
  error?: string;
}

/**
 * Render HTML template
 */
async function renderReportTemplate(
  reportType: string,
  data: Record<string, any>,
): Promise<string> {
  return `
    <!DOCTYPE html>
    <html>
      <head><style>body{font-family:sans-serif;padding:40px;} h1{color:#333;}</style></head>
      <body>
        <h1>${reportType} Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body>
    </html>
  `;
}

/**
 * Save PDF to local disk
 */
async function saveToLocalDisk(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "uploads");

  // Ensure directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);

  // Return URL (in production, this would be S3/CDN URL)
  return `${process.env.REPORT_BASE_URL || "http://localhost:5002"}/uploads/${fileName}`;
}

/**
 * Main Job Processor
 */
export async function processReportJob(
  job: Job<IReportJobData>,
): Promise<IReportResult> {
  const { reportType, data, userId } = job.data;
  const jobId = job.id;

  logger.info({ jobId, reportType, userId }, "🔄 Processing report job");

  await job.updateProgress(10);

  let browser: Browser | null = null;

  try {
    // 1. Render Template
    await job.updateProgress(20);
    const html = await renderReportTemplate(reportType, data);

    // 2. Launch Browser
    await job.updateProgress(40);
    browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      headless: true,
    });

    // 3. Generate PDF
    await job.updateProgress(60);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = Buffer.from(
      await page.pdf({ format: "A4", printBackground: true }),
    );
    await browser.close();
    browser = null;

    // 4. Save Locally
    await job.updateProgress(80);
    const fileName = `${reportType}-${jobId}-${Date.now()}.pdf`;
    const reportUrl = await saveToLocalDisk(pdfBuffer, fileName);

    // 5. Store Result in Redis (Metadata)
    await job.updateProgress(100);
    const result: IReportResult = {
      success: true,
      reportUrl,
      fileName,
      fileSize: pdfBuffer.length,
      processedAt: Date.now(),
    };

    // Store in Redis for 24 hours
    await redisConnection.setex(
      `job:result:${jobId}`,
      86400,
      JSON.stringify(result),
    );

    logger.info(
      { jobId, reportUrl, fileSize: pdfBuffer.length },
      "✅ Report generated",
    );

    return result;
  } catch (error: any) {
    logger.error({ jobId, error: error.message }, "❌ Job failed");

    // Store Error in Redis
    await redisConnection.setex(
      `job:error:${jobId}`,
      3600,
      JSON.stringify({ error: error.message, timestamp: Date.now() }),
    );

    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }

    throw error; // Trigger BullMQ retry
  }
}
