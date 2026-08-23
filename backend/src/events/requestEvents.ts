import { createRedisConnection } from "../config/redis.js";
import { PROGRESS_CHANNEL } from "../ws/socket.js";

const publisher = createRedisConnection("pubsub:progress:publisher:api");

export async function closeRequestEventsPublisher(): Promise<void> {
    await publisher.quit();
}

export async function publishRequestCreated(requestId: string): Promise<void> {
    await publisher.publish(
        PROGRESS_CHANNEL,
        JSON.stringify({ requestId, status: "PENDING", completed: 0, startEvent: true }),
    );
}
