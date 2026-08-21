import { Router } from "express";
import { getHealth } from "../controllers/health.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// /api/v1/health
export const healthRouter = Router()

healthRouter.get("/check",asyncHandler(getHealth))

