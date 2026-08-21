
import { Worker, type Job } from "bullmq";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { createRedisConnection } from "../config/redis.js";
import { PROGRESS_CHANNEL } from "../ws/socket.js";
import { qrGenerationPreProcess } from "../services/qrgeneration.service.js";

const progressPublisher = createRedisConnection("pubsub:progress:publisher");

export async function closeProgressPublisher(): Promise<void> {
    await progressPublisher.quit();
}

type ProgressStatus = "PROCESSING" | "COMPLETED" | "FAILED";

async function publishProgress(requestId: string, status: ProgressStatus): Promise<void> {
    await progressPublisher.publish(PROGRESS_CHANNEL, JSON.stringify({ requestId, status }));
}

export function createQrGenerationWorker(): Worker<{ requestId: string }> {
    const worker = new Worker<{ requestId: string }>(
        env.QR_JOB_QUEUE_NAME,
        async (job: Job<{ requestId: string }>) => {
            logger.info({ jobId: job.id, data: job.data }, "Processing QR generation job");
            await publishProgress(job.data.requestId, "PROCESSING");
            qrGenerationPreProcess(job.data.requestId);
            // TODO :: 
            
            // crete qr
            // signal
            // 
        },
        {
            connection: createRedisConnection("queue:qr-generation:worker"),
            concurrency: env.WORKER_CONCURRENCY,
        },
    );

    worker.on("completed", (job) => {
        void publishProgress(job.data.requestId, "COMPLETED");
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
