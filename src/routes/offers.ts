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
      handle(async ({ res, params, db }) => {
        const result = await db.offersDb.createOffer(params);
        res.status(201).send(result);
      }),
    );
    return router;
  }
}
