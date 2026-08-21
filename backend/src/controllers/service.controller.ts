
import type { Request, Response } from "express";
import type { CreateServiceRequestInput } from "../schema/service.schema.js";
import { prisma } from "../config/db.js";
import { qrGenerationQueue } from "../queues/qr.queue.js";



export async function createServiceRequst(req: Request, res: Response): Promise<void> {
    const { url, idRangeStart, idRangeEnd } = req.body as CreateServiceRequestInput;
    try {
        const totalItems = idRangeEnd - idRangeStart + 1;
        const serviceRequest = await prisma.serviceRequest.create({
            data: { url, idRangeStart, idRangeEnd, totalItems },
        });

        await qrGenerationQueue.add("generate-qr-codes", { requestId: serviceRequest.id }, {
            jobId: serviceRequest.id,
        });

        res.status(201).json({
            id: serviceRequest.id,
            url,
            idRangeStart,
            idRangeEnd,
        });
        return;
    } catch (error) {
        res.status(500).json({ error: "Failed to create service request" });
        return;
    }
}
