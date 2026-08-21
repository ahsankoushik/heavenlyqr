import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { closeProgressPublisher, createQrGenerationWorker } from "./workers/qr.worker.js";


async function main(): Promise<void> {
    await connectDatabase();

    const worker = createQrGenerationWorker();
    logger.info(
        { queue: env.QR_JOB_QUEUE_NAME, concurrency: env.WORKER_CONCURRENCY },
        "QR generation worker started",
    );

    const shutdown = async (signal: string): Promise<void> => {
        logger.info({ signal }, "Shutting down worker...");
        await worker.close();
        await closeProgressPublisher();
        await disconnectDatabase();
        process.exit(0);
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
    logger.error({ err }, "Failed to start worker");
    process.exit(1);
});

