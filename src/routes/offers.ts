import { Router } from 'express';
import { handle } from '../middlewares/handler';
import { authenticate } from '../middlewares/auth-middleware';
import { Roles } from '../models/roles';

export class OffersRouter {
  public static async init(): Promise<Router> {
    const router = Router();
    router.post(
      '/',
      authenticate({ roles: [Roles.Type.USER] }),
      handle(async ({ res, params, db, userId }) => {
        const result = await db.offersDb.createOffer(params, userId);
        res.status(201).send(result);
      }),
    );

    router.get(
      '/',
      authenticate({ roles: [Roles.Type.ADMIN] }),
      handle(async ({ res, db, params }) => {
        const result = await db.offersDb.getOffers(params);
        res.send(result);
      }),
    );

    router.patch(
      '/',
      authenticate({ roles: [Roles.Type.ADMIN] }),
      handle(async ({ res, params, db }) => {
        const result = await db.offersDb.changeState(params);
        res.send(result);
      }),
    );
    return router;
  }
}
