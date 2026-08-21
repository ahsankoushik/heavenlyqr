// main backend server 
//
//
//

import { createServer } from "http";
import { createApp } from "./app.js";
import { env } from "process";
import { logger } from "./config/logger.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";


async function main(): Promise<void> {
    await connectDatabase();

    const app = createApp();
    const httpServer = createServer(app);
    // attach socketio

    httpServer.listen(env.PORT, () => {
        logger.info(`API listener running on port ${env.PORT} (${env.NODE_ENV})`);
    });


    // gracefull shutdown
    const shutdown = async (signal: string): Promise<void> => {
        logger.info({ signal }, "Shutting down API listener...");
        httpServer.close();
        await disconnectDatabase();
        process.exit(0);
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));

}


main().catch((err) => {
  logger.error({ err }, "Failed to start API listener");
  process.exit(1);
});

