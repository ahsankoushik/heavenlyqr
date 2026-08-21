import { prisma } from "../config/db.js";
import { createRedisConnection } from "../config/redis.js";

export interface HealthStatus {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  dependencies: {
    database: "up" | "down";
    redis: "up" | "down";
  };
}

const redisPing = createRedisConnection("health-check");


export async function getHealthStatus(): Promise<HealthStatus> {
  const [database, redis] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(
      () => "up" as const,
      () => "down" as const,
    ),
    redisPing.ping().then(
      () => "up" as const,
      () => "down" as const,
    ),
  ]);

  return {
    status: database === "up" && redis === "up" ? "ok" : "degraded",
    uptimeSeconds: process.uptime(),
    dependencies: { database, redis },
  };
}
