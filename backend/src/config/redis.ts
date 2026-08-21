
import { Redis, type RedisOptions } from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

const baseOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};


export function createRedisConnection(label: string): Redis {
  const connection = new Redis(baseOptions);

  connection.on("connect", () => logger.info({ label }, "Redis connected"));
  connection.on("error", (err) => logger.error({ label, err }, "Redis connection error"));

  return connection;
}
