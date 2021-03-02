import { Router } from 'express';
import { handle } from '../middlewares/handler';
import { authenticate } from '../middlewares/auth-middleware';
import { Roles } from '../models/roles';

export class WantedRouter {
  public static async init(): Promise<Router> {
    const router = Router();

    router.post(
      '/',
      authenticate({ roles: [Roles.Type.USER] }),
      handle(async ({ res, db, params }) => {
        const result = await db.wantedDb.createWanted(params);
        res.status(201).send(result);
      }),
    );
    return router;
  }
}
