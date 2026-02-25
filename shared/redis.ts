// producer/src/redis/queue.ts
import { Queue } from "bullmq";
import { connection } from "shared/redis";
import { REPORT_QUEUE } from "shared/constants";

export const reportQueue = new Queue(REPORT_QUEUE, { connection });
