
```
┌─────────────────┐
│   USER/CLIENT   │
└────────┬────────┘
         │ HTTP POST /api/v1/reports/generate
         ▼
┌─────────────────┐     ┌─────────────────┐
│   PRODUCER      │────▶│     REDIS       │
│  (Express.js)   │     │  (BullMQ Queue) │
│  Port: 5001     │     │  Port: 6379     │
└─────────────────┘     └────────┬────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   WORKER #1     │ │   WORKER #2     │ │   WORKER #N     │
│  (Node.js)      │ │  (Node.js)      │ │  (Node.js)      │
│  Port: 5002     │ │  Port: 5002     │ │  Port: 5002     │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────────────────────────────────────┐
│              LOCAL STORAGE / UPLOADS            │
│         (Generated PDFs saved here)             │
└─────────────────────────────────────────────────┘

┌─────────────────┐
│   SCHEDULER     │  (Monitors for stalled jobs)
│  (Node.js)      │  (Separate container)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   DASHBOARD     │  (Monitoring API + UI)
│  (Express.js)   │  Port: 5003
└─────────────────┘
```


```

┌─────────────────────────────────────────────────────┐
│                    JOB LIFECYCLE                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. SUBMIT                                          │
│     User → Producer → Redis Queue                   │
│     State: waiting                                  │
│                                                     │
│  2. CLAIM                                           │
│     Worker polls Redis → Atomic pop → Lock acquired │
│     State: active                                   │
│                                                     │
│  3. PROCESS                                         │
│     Worker: Generate PDF → Save to disk             │
│     Redis: Update progress, store metadata          │
│     State: active (progress: 0→100)                 │
│                                                     │
│  4. COMPLETE                                        │
│     Worker: Return result → BullMQ marks done       │
│     Redis: Move to completed set, store result      │
│     State: completed                                │
│                                                     │
│  5. RETRIEVE                                        │
│     User → Dashboard → Redis → Return result + URL  │
│     User → Worker → Download PDF from /uploads      │
│                                                     │
└─────────────────────────────────────────────────────┘

```

```
┌─────────────────────────────────────────────────────────┐
│  worker/src/index.ts EXECUTION FLOW                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Load environment variables (dotenv)                 │
│     ↓                                                   │
│  2. Import dependencies                                 │
│     - redis.ts → Connects to Redis                      │
│     - report.processor.ts → Loads job handler           │
│     - health.ts → Prepares health server                │
│     ↓                                                   │
│  3. Call startWorker() function                         │
│     ↓                                                   │
│  4. Start Health Server (health.ts)                     │
│     - Opens port 5002                                   │
│     - Listens for GET /health requests                  │
│     ↓                                                   │
│  5. Create BullMQ Worker                                │
│     - Connects to Redis queue "report:queue"            │
│     - Sets concurrency (e.g., 2 jobs at once)           │
│     - Registers job processor (report.processor.ts)     │
│     ↓                                                   │
│  6. Attach Event Listeners                              │
│     - on("completed") → Log success                     │
│     - on("failed") → Log error                          │
│     - on("stalled") → Log warning                       │
│     ↓                                                   │
│  7. Setup Graceful Shutdown Handlers                    │
│     - SIGINT (Ctrl+C) → Close worker, exit              │
│     - SIGTERM (Docker stop) → Close worker, exit        │
│     ↓                                                   │
│  8. Worker IDLES & WAITS                                │
│     - Polls Redis for new jobs                          │
│     - When job arrives → Calls report.processor.ts      │
│     - Continues polling...                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```