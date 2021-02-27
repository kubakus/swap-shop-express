import { Router } from "express";
import { handle } from "../common/handler";
import { authentication } from "../middlewares/auth-middleware";
import { RolesRouter } from "./roles";
import { UsersRouter } from "./users";


export class ApiRouter {
    public static async create(): Promise<Router> {
        const router = Router()
        router.get(
            '/work',
            authentication(),
            handle( async ({ res}) => {
                res.sendStatus(200)
            })
        )
        router.use('/roles', await RolesRouter.init())
        router.use('/users', await UsersRouter.init())
        // TODO Add routes/subrouters here
        
        return router
    }
}