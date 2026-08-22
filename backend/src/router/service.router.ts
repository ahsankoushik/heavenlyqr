import { Router } from "express";
import { validateRequest } from "../middlewares/validateRequest.js";
import {
    createServiceRequestSchema,
    listQrItemsQuerySchema,
    listServiceRequestsQuerySchema,
    requestIdParamsSchema,
    requestItemParamsSchema,
} from "../schema/service.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    createServiceRequst,
    getServiceRequests,
    getServiceRequest,
    getServiceRequestItems,
    downloadQrItemImage,
    cancelServiceRequest,
} from "../controllers/service.controller.js";


// /api/v1/service
export const serviceRouter = Router()


serviceRouter.post("/requests", validateRequest({ body: createServiceRequestSchema }), asyncHandler(createServiceRequst))
serviceRouter.get("/requests", validateRequest({ query: listServiceRequestsQuerySchema }), asyncHandler(getServiceRequests))
serviceRouter.get("/requests/:id", validateRequest({ params: requestIdParamsSchema }), asyncHandler(getServiceRequest))
serviceRouter.get("/requests/:id/items", validateRequest({ params: requestIdParamsSchema, query: listQrItemsQuerySchema }), asyncHandler(getServiceRequestItems))
serviceRouter.get("/requests/:id/items/:itemId/image", validateRequest({ params: requestItemParamsSchema }), asyncHandler(downloadQrItemImage))
serviceRouter.post("/requests/:id/cancel", validateRequest({ params: requestIdParamsSchema }), asyncHandler(cancelServiceRequest))

