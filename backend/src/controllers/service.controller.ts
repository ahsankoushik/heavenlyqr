
import type { Request, Response } from "express";
import type { CreateServiceRequestInput } from "../schema/service.schema.js";
import { prisma } from "../config/db.js";
import { qrGenerationQueue } from "../queues/qr.queue.js";
import { ApiError } from "../utils/ApiError.js";



export async function createServiceRequst(_req: Request, res: Response): Promise<void> {
    const { url, idRangeStart, idRangeEnd } = _req.body as CreateServiceRequestInput;
    try {
        const totalItems = idRangeEnd - idRangeStart + 1;
        const serviceRequest = await prisma.serviceRequest.create({
            data: { url, idRangeStart, idRangeEnd, totalItems },
        });

        await qrGenerationQueue.add("generate-qr-codes", { requestId: serviceRequest.id }, {
            jobId: serviceRequest.id,
        });

        res.status(202).json({
            id: serviceRequest.id,
            url,
            idRangeStart,
            idRangeEnd,
        });
        return;
    } catch (error) {
        throw new ApiError(500, "Failed to create service request")
    }
}



export async function getServiceRequests(_req: Request, res: Response): Promise<void> {
    const serviceRequests = await prisma.serviceRequest.findMany()
    res.json({ data: serviceRequests })
}


export async function getServiceRequest(_req: Request, res: Response): Promise<void> {
    const id = _req.params.id as string;
    try {
        const serviceRequest = await prisma.serviceRequest.findFirstOrThrow({ where: { id } })
        res.json({ data: serviceRequest })
    } catch (e) {
        throw new ApiError(404, "Not Found")
    }
}



export async function cancelServiceRequest(_req: Request, res: Response): Promise<void> {
    const id = _req.params.id as string;
    try {
        const serviceRequest = await prisma.serviceRequest.findFirstOrThrow({ where: { id } })
        switch (serviceRequest.status) {
            case "COMPLETED":
                res.json({
                    message: "Task Already COMPLETED",
                    data: serviceRequest
                })
                break
            case "PENDING":
                let updated = await prisma.serviceRequest.update({ where: { id: serviceRequest.id }, data: { status: "CANCELLED" } })
                res.json({
                    message: "Task CANCELLED",
                    data: updated
                })
                break
            case "PROCESSING":
                const updated1 = await prisma.serviceRequest.update({ where: { id: serviceRequest.id }, data: { status: "CANCELLED" } })
                res.json({
                    message: "Task CANCELLED",
                    data: updated1
                })
                break

            case "PARTIALLY_FAILED":
                const up2 = await prisma.serviceRequest.update({ where: { id: serviceRequest.id }, data: { status: "CANCELLED" } })
                res.json({
                    message: "Task CANCELLED",
                    data: up2
                })
                break
            case "FAILED":
                const up3 = await prisma.serviceRequest.update({ where: { id: serviceRequest.id }, data: { status: "CANCELLED" } })
                res.json({
                    message: "Task CANCELLED",
                    data: up3
                })
                break
            case "CANCELLED":
                res.json({
                    message: "Task Already CANCELLED",
                    data: serviceRequest
                })
                break
        }
    } catch (e) {
        throw new ApiError(404, "Not Found")
    }
}
