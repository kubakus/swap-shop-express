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
      handle(async ({ res, db, params, userId }) => {
        const result = await db.wantedDb.createWanted(params, userId);
        res.status(201).send(result);
      }),
    );

    router.get(
      '/',
      authenticate({ roles: [Roles.Type.ADMIN] }),
      handle(async ({ db, res, params }) => {
        const wanted = await db.wantedDb.getWanted(params);
        res.send(wanted);
      }),
    );

    router.patch(
      '/',
      authenticate({ roles: [Roles.Type.ADMIN] }),
      handle(async ({ res, params, db }) => {
        const result = await db.wantedDb.changeState(params);
        res.send(result);
      }),
    );
    return router;
  }
}
