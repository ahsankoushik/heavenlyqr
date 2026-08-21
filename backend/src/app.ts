import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { apiRouter } from "./router/index.js";


export function createApp(): Express {
    const app = express();

    app.disable("x-powered-by");
    app.use(helmet());
    app.use(cors({ origin: env.CORS_ORIGIN }));
    app.use(compression());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(pinoHttp({ logger }));

    app.use("/api/v1",apiRouter)


    app.use(notFound);
    app.use(errorHandler);



    return app;
}
