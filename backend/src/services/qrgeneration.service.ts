import { prisma } from "../config/db.js";


export async function qrGenerationPreProcess(requestId: string) {
    const request = await prisma.serviceRequest.findUniqueOrThrow({
        where: { id: requestId },
    });

    await prisma.serviceRequest.update({
        where: { id: requestId },
        data: { status: "PROCESSING" },
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
}
