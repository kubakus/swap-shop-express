import { Router } from "express";
import { handle } from "../common/handler";

export class RolesRouter {
    public static async init (): Promise<Router> {
        const router = Router();
        router.post(
            '/',
            handle(async ({ res, db, params }) => {
                const response = await db.rolesDb.createRole(params);
                res.status(201).json({ ...response });
            })
        )
        return router;
    }
}