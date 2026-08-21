import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { ZipArchive } from "archiver";
import QRCode from "easyqrcodejs-nodejs";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ProgressStatus } from "../types/progressStatus.js";


function getRequestDir(requestId: string): string {
    return path.join(env.STORAGE_DIR, requestId);
}

function getRequestZipPath(requestId: string): string {
    return path.join(env.STORAGE_DIR, `${requestId}.zip`);
}

function buildQrText(baseUrl: string, itemId: number): string {
    return `${baseUrl.replace(/\/+$/, "")}/${itemId}`;
}

async function generateQrImage(text: string, imagePath: string): Promise<void> {
    const qrcode = new QRCode({ text, width: 256, height: 256 });
    await qrcode.saveImage({ path: imagePath });
}

async function zipRequestDirectory(requestId: string): Promise<string> {
    const sourceDir = getRequestDir(requestId);
    const zipPath = getRequestZipPath(requestId);

    await new Promise<void>((resolve, reject) => {
        const output = createWriteStream(zipPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });

        output.on("close", () => resolve());
        output.on("error", (error: Error) => reject(error));
        archive.on("error", (error: Error) => reject(error));

        archive.pipe(output);
        archive.directory(sourceDir, false);
        void archive.finalize();
    });

    return zipPath;
}


async function qrGenerationPreProcess(requestId: string) {
    // just to make sure we don't pick up cancelled and make is processing
    const { count } = await prisma.serviceRequest.updateMany({
        where: { id: requestId, status: { not: "CANCELLED" } },
        data: { status: "PROCESSING" },
    });
    if (count === 0) {
        return null;
    }

    const request = await prisma.serviceRequest.findUniqueOrThrow({
        where: { id: requestId },
    });

    await prisma.qrItem.createMany({
        data: Array.from(
            { length: request.totalItems },
            (_, index) => ({
                itemId: request.idRangeStart + index,
                serviceRequestId: request.id,
            }),
        ),
        skipDuplicates: true,
    });

    await mkdir(getRequestDir(request.id), { recursive: true });

    return request;
}

// when cancelled gets the status
async function isCancelled(requestId: string): Promise<boolean> {
    const current = await prisma.serviceRequest.findUniqueOrThrow({
        where: { id: requestId },
        select: { status: true },
    });
    return current.status === "CANCELLED";
}

export async function processRequest(requestId: string, onProgress: (requestId: string, status: ProgressStatus, completed?: number) => Promise<void>) {
    const request = await qrGenerationPreProcess(requestId);
    if (!request) {
        // Cancelled before the worker ever started it.
        await onProgress(requestId, "CANCELLED", 0);
        return;
    }

    const items = await prisma.qrItem.findMany({
        where: {
            serviceRequestId: requestId,
            status: "PENDING",
        },
    });
    let done = 0;
    let failed = 0;
    let cancelled = false;

    for (const item of items) {
        if (await isCancelled(requestId)) {
            cancelled = true;
            break;
        }

        try {
            await prisma.qrItem.update({
                where: { id: item.id },
                data: { status: "PROCESSING", attempts: { increment: 1 } },
            });
            const imagePath = path.join(getRequestDir(requestId), `${item.itemId}.png`);
            await generateQrImage(buildQrText(request.url, item.itemId), imagePath);
            await prisma.qrItem.update({
                where: { id: item.id },
                data: {
                    status: "COMPLETED",
                    imagePath,
                },
            });
            done++;
            await prisma.serviceRequest.update({ where: { id: requestId }, data: { completedItems: done } });
            await onProgress(requestId, "PROCESSING", done);
        } catch (error) {
            await prisma.qrItem.update({
                where: { id: item.id },
                data: {
                    status: "FAILED",
                    errorMessage: String(error),
                },
            });
            failed++;
            await prisma.serviceRequest.update({ where: { id: requestId }, data: { failedItems: failed } });
        }
    }

    if (cancelled) {
        await prisma.qrItem.updateMany({
            where: { serviceRequestId: requestId, status: "PENDING" },
            data: { status: "CANCELLED" },
        });
        await onProgress(requestId, "CANCELLED", done);
        return;
    }

    try {
        const zipPath = await zipRequestDirectory(requestId);
        logger.info({ requestId, zipPath }, "Zipped QR images for request");
    } catch (error) {
        logger.error({ requestId, err: error }, "Failed to zip QR images for request");
    }

    const finalStatus = failed === 0 ? "COMPLETED" : done === 0 ? "FAILED" : "PARTIALLY_FAILED";
    await prisma.serviceRequest.update({
        where: { id: requestId },
        data: { status: finalStatus, completedItems: done, failedItems: failed },
    });
    await onProgress(requestId, finalStatus === "COMPLETED" ? "COMPLETED" : "FAILED", done);
}
