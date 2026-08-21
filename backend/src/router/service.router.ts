import { Router } from "express";
import { validateRequest } from "../middlewares/validateRequest.js";
import { createServiceRequestSchema } from "../schema/service.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createServiceRequst } from "../controllers/service.controller.js";



export const serviceRouter = Router()



serviceRouter.post("/request", validateRequest({ body: createServiceRequestSchema }), asyncHandler(createServiceRequst))


