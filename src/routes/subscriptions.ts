import { Router } from 'express';
import { authenticate } from '../middlewares/auth-middleware';
import { handle } from '../middlewares/handler';
import { Roles } from '../models/roles';

export class SubscriptionsRouter {
  public static async init(): Promise<Router> {
    const router = Router();
    router.post(
      '/',
      authenticate({ roles: [Roles.Type.ADMIN] }),
      handle(async ({ db, params, userId, res, emailDispatcher }) => {
        const result = await db.subscriptionsDb.createSubscription(params, userId);
        await emailDispatcher.createDispatchTimeout(db, result.id);
        res.send(result);
      }),
    );

    router.get(
      '/',
      authenticate({ roles: [Roles.Type.ADMIN] }),
      handle(async ({ db, params, res }) => {
        const result = await db.subscriptionsDb.getSubscriptions(params);
        res.send(result);
      }),
    );

    return router;
  }
}
