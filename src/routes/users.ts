import { Router } from "express";
import { handle } from "../common/handler";

export class UsersRouter {
    public static async init(): Promise<Router> {
        const router = Router()
        router.post(
            '/register',
            handle(async({ res, db, params}) => {
                
                res.send(await db.usersDb.createUser(params))
            })
        )

        router.post(
            '/authenticate',
            handle(async ({ db, res, params}) => {
                const response = await db.usersDb.login(params)
                res.send(response)
            })
        )
        return router;
    }
    
}