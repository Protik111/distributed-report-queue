
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
