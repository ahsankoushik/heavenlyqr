import fs from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import type {
    CreateServiceRequestInput,
    ListQrItemsQuery,
    ListServiceRequestsQuery,
    RequestIdParams,
    RequestItemParams,
} from "../schema/service.schema.js";
import { prisma } from "../config/db.js";
import { qrGenerationQueue, removeQueuedJob } from "../queues/qr.queue.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";



export async function createServiceRequst(_req: Request, res: Response): Promise<void> {
    const { url, idRangeStart, idRangeEnd } = _req.body as CreateServiceRequestInput;
    const totalItems = idRangeEnd - idRangeStart + 1;

    const serviceRequest = await prisma.serviceRequest.create({
        data: { url, idRangeStart, idRangeEnd, totalItems },
    });

    try {
        await qrGenerationQueue.add("generate-qr-codes", { requestId: serviceRequest.id }, {
            jobId: serviceRequest.id,
        });
    } catch (error) {
        // if unable to queue then delete
        await prisma.serviceRequest.delete({ where: { id: serviceRequest.id } });
        throw error;
    }

    res.status(202).json({
        id: serviceRequest.id,
        url: serviceRequest.url,
        idRangeStart: serviceRequest.idRangeStart,
        idRangeEnd: serviceRequest.idRangeEnd,
        status: serviceRequest.status,
        totalItems: serviceRequest.totalItems,
        createdAt: serviceRequest.createdAt,
    });
}



export async function getServiceRequests(_req: Request, res: Response): Promise<void> {
    const { page, limit, status, search, sortBy, sortOrder } = _req.query as unknown as ListServiceRequestsQuery;

    const where = {
        ...(status ? { status } : {}),
        ...(search ? { url: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [data, total] = await Promise.all([
        prisma.serviceRequest.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.serviceRequest.count({ where }),
    ]);

    res.json({
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    });
}


export async function getServiceRequest(_req: Request, res: Response): Promise<void> {
    const { id } = _req.params as unknown as RequestIdParams;
    const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id } });
    if (!serviceRequest) {
        throw ApiError.notFound("Service request not found");
    }
    res.json({ data: serviceRequest });
}


// back in a single response.
export async function getServiceRequestItems(_req: Request, res: Response): Promise<void> {
    const { id } = _req.params as unknown as RequestIdParams;
    const { page, limit, status } = _req.query as unknown as ListQrItemsQuery;

    const exists = await prisma.serviceRequest.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
        throw ApiError.notFound("Service request not found");
    }

    const where = { serviceRequestId: id, ...(status ? { status } : {}) };

    const [data, total] = await Promise.all([
        prisma.qrItem.findMany({
            where,
            orderBy: { itemId: "asc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.qrItem.count({ where }),
    ]);

    res.json({
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
    });
}

export async function downloadRequestZip(
    req: Request,
    res: Response,
): Promise<void> {
    const { id } = req.params as RequestIdParams;

    const request = await prisma.serviceRequest.findUnique({
        where: { id },
        select: { status: true },
    });

    if (!request) {
        throw ApiError.notFound("Service request not found");
    }

    if (!["COMPLETED", "PARTIALLY_FAILED", "FAILED"].includes(request.status)) {
        throw ApiError.conflict("ZIP file is not ready yet");
    }

    const zipPath = path.resolve(env.STORAGE_DIR, `${id}.zip`);

    if (!fs.existsSync(zipPath)) {
        throw ApiError.notFound("ZIP file not found");
    }

    res.download(zipPath, `${id}.zip`);
}

export async function downloadQrItemImage(_req: Request, res: Response): Promise<void> {
    const { id, itemId } = _req.params as unknown as RequestItemParams;

    const item = await prisma.qrItem.findUnique({
        where: { serviceRequestId_itemId: { serviceRequestId: id, itemId } },
    });
    if (!item) {
        throw ApiError.notFound("QR item not found");
    }
    if (item.status !== "COMPLETED" || !item.imagePath) {
        throw ApiError.conflict(`QR image is not ready yet (item status: ${item.status.toLowerCase()})`);
    }

    const absolutePath = path.resolve(item.imagePath);
    await new Promise<void>((resolve, reject) => {
        res.sendFile(absolutePath, (error) => {
            if (!error) {
                resolve();
                return;
            }
            if (res.headersSent) {
                // Response was already partially sent; nothing more we can do.
                resolve();
                return;
            }
            reject(error);
        });
    }).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") {
            // DB says COMPLETED but the file isn't on disk — data integrity
            // issue worth knowing about, but a 404 to the client either way.
            throw ApiError.notFound("QR image file is missing on disk");
        }
        throw error;
    });
}



export async function cancelServiceRequest(_req: Request, res: Response): Promise<void> {
    const { id } = _req.params as unknown as RequestIdParams;
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
