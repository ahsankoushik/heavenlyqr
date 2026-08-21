import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof ZodError) {
        res.status(400).json({
            error: {
                message: "Validation failed",
                details: err.flatten(),
            },
        });
        return;
    }

    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            error: {
                message: err.message,
                details: err.details,
            },
        });
        return;
    }

    logger.error({ err, path: req.originalUrl, method: req.method }, "Unhandled error");

    res.status(500).json({
        error: {
            message: "Internal server error",
            ...(env.NODE_ENV !== "production" && err instanceof Error ? { stack: err.stack } : {}),
        },
    });
}
