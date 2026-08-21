
import type { Request, Response } from "express";
import type { CreateServiceRequestInput } from "../schema/service.schema.js";
import { prisma } from "../config/db.js";
import { qrGenerationQueue, removeQueuedJob } from "../queues/qr.queue.js";
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
    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!serviceRequest) {
        throw ApiError.notFound("Service request not found");
    }

    if (serviceRequest.status === "PENDING") {
        await removeQueuedJob(id);
        const updated = await prisma.serviceRequest.update({
            where: { id },
            data: { status: "CANCELLED" },
        });
        res.json({ message: "Request cancelled", data: updated });
        return;
    }

    if (serviceRequest.status === "PROCESSING") {
        // set the flag to cancelled 
        // and stop
        const updated = await prisma.serviceRequest.update({
            where: { id },
            data: { status: "CANCELLED" },
        });
        res.json({ message: "Cancellation requested; in-flight items are stopping", data: updated });
        return;
    }
    // rest can not be cancelled
    throw ApiError.conflict(`Request is already ${serviceRequest.status.toLowerCase()}; nothing to cancel`);
}
