# Distributed Job Queue System

## 1. Executive Summary
This project implements a production-grade distributed job queue system designed for asynchronous report generation. Leveraging a decoupled microservices architecture, it ensures high availability, scalability, and reliability by using Redis as a message broker and AWS S3 for persistent storage.

![System Architecture Diagram](architecture.png)

---

## 2. Project Structure Overview

The repository is organized into distinct sub-modules to separate infrastructure, frontend, and backend services.

```text
.
├── dashboard-api/          # Express.js service providing queue analytics
│   ├── src/
│   │   ├── lib/redis.ts    # Centralized Redis connection logic
│   │   └── app.ts          # REST endpoints for dashboard data
├── dashboard-frontend/     # React + Vite UI portal
│   ├── src/
│   │   ├── components/     # Reusable UI cards and tables
│   │   └── App.tsx         # Dashboard main layout and state
├── producer/               # Entry point for submitting new job requests
│   ├── src/
│   │   └── app/routes/     # API route definitions
├── worker/                 # Core processing engine
│   ├── src/
│   │   ├── processors/     # PDF generation logic (Puppeteer)
│   │   ├── lib/s3.service.ts # AWS S3 upload utility
│   │   ├── index.ts        # Main worker initialization
│   │   └── scheduler.ts    # Stalled job recovery monitor
├── infra/                  # Docker Compose files for local/prod environments
├── infra-pulumi/           # Infrastructure as Code (AWS provisioner)
└── assignment_report.md    # Detailed project documentation
```

---

## 3. System Architecture & Design Decisions

### 3.1 Component Role Breakdown
- **Producer**: Acts as the gateway. It validates input and pushes a "generate-report" job into the Redis `report-queue`.
- **Worker**: The "heavy lifter". Multiple replicas can run concurrently to drain the queue.
- **Scheduler**: A lightweight monitor that ensures jobs don't stay in "active" state forever if a worker crashes.

### 3.2 Technical Tradeoffs
- **BullMQ over plain Redis**: BullMQ handles the complexity of atomic operations and job state transitions, reducing the risk of data races.
- **S3 vs Local Storage**: Local storage is ephemeral in Docker. Using S3 ensures that reports persist across container restarts and scale-outs.

---

## 4. Worker Service Internals

The Worker Service is the most critical part of the system, handling intensive PDF generation tasks.

### 4.1 Job Processing Lifecycle
1.  **Job Claim**: A worker pulls a job from Redis and sets a lock (default 5 mins) to prevent other workers from touching it.
2.  **Rendering**: The `report.processor.ts` generates dynamic HTML based on the job payload.
3.  **PDF Generation**: A local Puppeteer instance (Headless Chrome) renders the HTML.
4.  **S3 Persistence**: The raw PDF buffer is uploaded to AWS S3 using the SDK, returning a public URL.
5.  **Completion**: The worker updates the job status in Redis and releases the lock.

### 4.2 Error Handling & Concurrency
- **Concurrency**: Each worker is configured to handle `WORKER_CONCURRENCY=2` jobs simultaneously using asynchronous event loops.
- **Automatic Retries**: If Puppeteer fails (e.g., memory issue), BullMQ will automatically retry the job up to 3 times with exponential backoff.

---

## 5. API Documentation

- **POST `5001/api/v1/reports/generate`**: Submit a new report job.
- **GET `5003/api/stats`**: Real-time counts of waiting/active/completed/failed jobs.
- **GET `5003/api/workers`**: Lists all active workers and their health heartbeats.
- **GET `5003/api/jobs/completed`**: Fetches the last successfully generated reports.

---

## 6. Infrastructure & CI/CD Pipeline

### 6.1 Infrastructure (Pulumi)
The project uses **Pulumi (TypeScript)** to manage:
- **Networking**: VPC, Public Subnets, and Internet Gateways.
- **Compute**: EC2 instances with Amazon Linux 2023.
- **Storage**: S3 buckets configured with public-read ACLs.
- **IAM**: Instance Profiles allow the EC2 instances to talk to S3 without managing manual access keys.

### 6.2 CI/CD Workflow (GitHub Actions)
The system is deployed via an automated pipeline defined in `.github/workflows/aws-ec2-deploy.yml`:

1.  **Trigger**: On push to `main` branch after a successful Docker build.
2.  **Infra Refresh**: Pulumi ensures the AWS environment is up-to-date.
3.  **SSH Deployment**:
    - The runner connects to the EC2 via SSH using dynamically generated keys from Pulumi.
    - It pulls the latest code and Docker images.
    - It runs `docker-compose -f infra/docker-compose.prod.yml up -d --scale worker=2`.
4.  **Health Verification**: The pipeline runs `curl` checks against the producer and dashboard APIs to ensure the system is operational before finishing.

---

## Conclusion
This system demonstrates a robust, production-ready distributed job queue using modern engineering practices and cloud-native infrastructure.