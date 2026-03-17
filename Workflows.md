




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
│     - Connects to Redis queue "report-queue"            │
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

#Complete Sevice-to-Key Connection Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REDIS (Central State)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  QUEUES (Sorted Sets):                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ report-queue          │ report-queue:active   │ report-queue:failed │   │
│  │ report-queue:wait     │ report-queue:completed│ report-queue:delayed│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  JOB DATA (Hashes/Strings):                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ job:{id}            │ job:{id}:progress   │ job:result:{id}         │   │
│  │ job:error:{id}      │ lock:report-queue:{id}                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  WORKER DATA (Strings):                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ worker:heartbeat:{id}                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲                    ▲
         │                    │                    │                    │
         │ ZADD, HSET         │ BRPOPLPUSH         │ ZRANGE, GET        │ GET, SETEX
         │ (Submit)           │ (Claim, Process)   │ (Monitor)          │ (Heartbeat)
         │                    │                    │                    │
         ▼                    ▼                    ▼                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│    PRODUCER     │ │     WORKER      │ │   SCHEDULER     │ │    DASHBOARD    │
│  (Express.js)   │ │  (BullMQ + TS)  │ │ (QueueScheduler)│ │  (Express.js)   │
│  Port: 5001     │ │  Port: 5002     │ │  (Internal)     │ │  Port: 5003     │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ Writes:         │ │ Reads/Writes:   │ │ Reads:          │ │ Reads:          │
│ - report-queue  │ │ - report-queue  │ │ - active jobs   │ │ - All queue     │
│ - job:{id}      │ │ - job:{id}      │ │ - lock:{id}     │ │   counts        │
│                 │ │ - job:result:{id}│ │                 │ │ - job:result:{id}│
│                 │ │ - job:{id}:prog │ │ Writes:         │ │ - worker:hb:{id}│
│                 │ │ - lock:{id}     │ │ - requeue jobs  │ │                 │
│                 │ │ - worker:hb:{id}│ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

Producer writes to Redis → Worker reads from Redis.
Worker writes lock to Redis → Scheduler reads lock from Redis.
Worker writes result to Redis → Dashboard reads result from Redis.
