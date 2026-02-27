
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