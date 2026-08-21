import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { serviceRouter } from "./service.router.js";
import { healthRouter } from "./health.router.js";



export const apiRouter = Router()

apiRouter.use("/health",healthRouter)
apiRouter.use("/service",serviceRouter)

