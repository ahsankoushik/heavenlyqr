
import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { createRedisConnection } from "../config/redis.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

export const PROGRESS_CHANNEL = "service-requests:progress";


export function initSocketServer(httpServer: HttpServer): SocketIOServer {
    const io = new SocketIOServer(httpServer, {
        cors: { origin: env.CORS_ORIGIN },
    });

    io.on("connection", (socket) => {
        logger.debug({ socketId: socket.id }, "WebSocket client connected");

        socket.on("subscribe:request", (requestId: string) => {
            void socket.join(`request:${requestId}`);
        });

        socket.on("unsubscribe:request", (requestId: string) => {
            void socket.leave(`request:${requestId}`);
        });

        socket.on("disconnect", () => {
            logger.debug({ socketId: socket.id }, "WebSocket client disconnected");
        });
    });

    // 1 subs per connection
    const subscriber = createRedisConnection("pubsub:progress:subscriber");
    void subscriber.subscribe(PROGRESS_CHANNEL);

    subscriber.on("message", (_channel, message) => {
        const progress = JSON.parse(message) as { requestId: string };
        io.to(`request:${progress.requestId}`).emit("progress", progress);
    });

    io.on("close", () => {
        subscriber.disconnect();
    });

    return io;
}
