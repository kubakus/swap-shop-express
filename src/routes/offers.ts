import { Router } from 'express';
import { handle } from '../middlewares/handler';
import { authenticate } from '../middlewares/auth-middleware';

export class OffersRouter {
  public static async init(): Promise<Router> {
    const router = Router();
    router.post(
      '/',
      authenticate(),
      handle(async ({ res, params, db }) => {
        const result = await db.offersDb.createOffer(params);
        res.status(201).send(result);
      }),
    );
    return router;
  }
}
