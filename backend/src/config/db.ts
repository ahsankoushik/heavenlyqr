
import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { logger } from "./logger.js";


// one prisma client 
// singleton pattern and pooling maintained by prisma
export const prisma = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export async function connectDatabase(): Promise<void> {
    await prisma.$connect();
    logger.info("Postgres connected");
}

export async function disconnectDatabase(): Promise<void> {
    await prisma.$disconnect();
    logger.info("Postgres disconnected");
}
