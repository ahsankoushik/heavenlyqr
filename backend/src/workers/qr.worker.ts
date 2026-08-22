
import { Worker, type Job } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { createRedisConnection } from "../config/redis.js";
import { PROGRESS_CHANNEL } from "../ws/socket.js";
import { processRequest } from "../services/qrgeneration.service.js";
import { ProgressStatus } from "../types/progressStatus.js";

export const progressPublisher = createRedisConnection("pubsub:progress:publisher");

export async function closeProgressPublisher(): Promise<void> {
    await progressPublisher.quit();
}


async function publishProgress(requestId: string, status: ProgressStatus, completed: number = 0, startEvent:boolean=false): Promise<void> {
    await progressPublisher.publish(PROGRESS_CHANNEL, JSON.stringify({ requestId, status, completed, startEvent}));
}

export function createQrGenerationWorker(): Worker<{ requestId: string }> {
    const worker = new Worker<{ requestId: string }>(
        env.QR_JOB_QUEUE_NAME,
        async (job: Job<{ requestId: string }>) => {
            logger.info({ jobId: job.id, data: job.data }, "Processing QR generation job");
            await publishProgress(job.data.requestId, "PROCESSING",0,true);
            await processRequest(job.data.requestId,publishProgress);

        },
        {
            connection: createRedisConnection("queue:qr-generation:worker"),
            concurrency: env.WORKER_CONCURRENCY,
        },
    );

    worker.on("completed", (job) => {
        logger.info({ jobId: job.id }, "Job completed");
    });

    worker.on("failed", (job, err) => {

        if (job) {
            void publishProgress(job.data.requestId, "FAILED");
        }
        logger.error({ jobId: job?.id, err }, "Job failed");
    });

    return worker;
}
