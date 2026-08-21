
import type { Request, Response } from "express";
import type { CreateServiceRequestInput } from "../schema/service.schema.js";




export async function createServiceRequst(req: Request, res: Response): Promise<void> {
    const { url, idRangeStart, idRangeEnd } = req.body as CreateServiceRequestInput;

    res.status(201).json({ url, idRangeStart, idRangeEnd });
}
