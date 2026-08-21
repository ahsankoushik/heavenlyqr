
import { z } from "zod";

const MAX_RANGE_SIZE = 5000;

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





