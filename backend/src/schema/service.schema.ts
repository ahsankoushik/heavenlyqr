
import { QrItemStatus, RequestStatus } from "@prisma/client";
import { z } from "zod";

const MAX_RANGE_SIZE = 5000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const createServiceRequestSchema = z
    .object({
        url: z.string().url("url must be a valid URL"),
        idRangeStart: z.coerce.number().int().nonnegative(),
        idRangeEnd: z.coerce.number().int().nonnegative(),
    })
    .refine((data) => data.idRangeEnd >= data.idRangeStart, {
        message: "idRangeEnd must be greater than or equal to idRangeStart",
        path: ["idRangeEnd"],
    })
    .refine((data) => data.idRangeEnd - data.idRangeStart + 1 <= MAX_RANGE_SIZE, {
        message: `Range cannot exceed ${MAX_RANGE_SIZE} IDs`,
        path: ["idRangeEnd"],
    });

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;

export const listServiceRequestsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    status: z.nativeEnum(RequestStatus).optional(),
    search: z.string().trim().min(1).optional(),
    sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListServiceRequestsQuery = z.infer<typeof listServiceRequestsQuerySchema>;

export const listQrItemsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    status: z.nativeEnum(QrItemStatus).optional(),
});

export type ListQrItemsQuery = z.infer<typeof listQrItemsQuerySchema>;

export const requestIdParamsSchema = z.object({
    id: z.string().uuid("invalid request id"),
});

export type RequestIdParams = z.infer<typeof requestIdParamsSchema>;

export const requestItemParamsSchema = requestIdParamsSchema.extend({
    itemId: z.coerce.number().int().nonnegative(),
});

export type RequestItemParams = z.infer<typeof requestItemParamsSchema>;





