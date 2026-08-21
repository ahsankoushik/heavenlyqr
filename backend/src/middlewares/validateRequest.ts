import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny } from "zod";

interface RequestSchemas {
    body?: ZodTypeAny;
    params?: ZodTypeAny;
    query?: ZodTypeAny;
}

export function validateRequest(schemas: RequestSchemas): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (schemas.body) req.body = schemas.body.parse(req.body);
        if (schemas.params) req.params = schemas.params.parse(req.params);
        if (schemas.query) req.query = schemas.query.parse(req.query);
        next();
    };
}
