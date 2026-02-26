import { Queue } from "bullmq";
import IORedis from "ioredis";
import { redisConfig } from "../shared/redis";
import { REPORT_QUEUE } from "../shared/constants";

const connection = new IORedis({
  ...redisConfig,
  maxRetriesPerRequest: null,
});

export const reportQueue = new Queue(REPORT_QUEUE, {
  connection,
});
