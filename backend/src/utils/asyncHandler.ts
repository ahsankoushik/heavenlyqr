import type { NextFunction, Request, RequestHandler, Response } from "express";

// instead of crasshing its sent to express's error handler middleware
//
export function asyncHandler(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
    return (req, res, next) => {
        void Promise.resolve(handler(req, res, next)).catch(next);
    };
}
