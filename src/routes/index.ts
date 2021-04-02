import { Router } from 'express';
import { EventsRouter } from './events';
import { OffersRouter } from './offers';
import { RolesRouter } from './roles';
import { SubscriptionsRouter } from './subscriptions';
import { UsersRouter } from './users';
import { WantedRouter } from './wanted';

export class ApiRouter {
  public static async create(): Promise<Router> {
    const router = Router();
    router.use('/roles', await RolesRouter.init());
    router.use('/auth', await UsersRouter.init());
    router.use('/offers', await OffersRouter.init());
    router.use('/wanted', await WantedRouter.init());
    router.use('/events', await EventsRouter.init());
    router.use('/subscriptions', await SubscriptionsRouter.init());

    return router;
  }
}
