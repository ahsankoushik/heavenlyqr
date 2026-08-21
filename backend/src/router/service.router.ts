import { Router } from "express";
import { validateRequest } from "../middlewares/validateRequest.js";
import { createServiceRequestSchema } from "../schema/service.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createServiceRequst, getServiceRequests, getServiceRequest, cancelServiceRequest } from "../controllers/service.controller.js";


// /api/v1/service
export const serviceRouter = Router()


serviceRouter.post("/requests", validateRequest({ body: createServiceRequestSchema }), asyncHandler(createServiceRequst))
serviceRouter.get("/requests", asyncHandler(getServiceRequests))
serviceRouter.get("/requests/:id", asyncHandler(getServiceRequest))
serviceRouter.post("/requests/:id/cancel", asyncHandler(cancelServiceRequest))


