import { Queue } from "bullmq";
import { createRedisConnection } from "../config/redis.js";
import { env } from "../config/env.js";

export const qrGenerationQueue = new Queue(env.QR_JOB_QUEUE_NAME, {
    connection: createRedisConnection("queue:qr-generation:producer"),
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
    },
});

// for pending jobs only
export async function removeQueuedJob(requestId: string): Promise<boolean> {
    const job = await qrGenerationQueue.getJob(requestId);
    if (!job) return false;
    if (await job.isActive()) return false;

    try {
        await job.remove();
        return true;
    } catch {
        return false;
    }
}
