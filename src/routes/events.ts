import { Router } from 'express';
import { authenticate } from '../middlewares/auth-middleware';
import { handle } from '../middlewares/handler';
import { Roles } from '../models/roles';

export class EventsRouter {
  public static async init(): Promise<Router> {
    const router = Router();
    router.post(
      '/',
      authenticate({ roles: [Roles.Type.USER] }),
      handle(async ({ res, db, params, userId }) => {
        const result = await db.eventsDb.createEvent(params, userId);
        res.status(201).send(result);
      }),
    );

    router.get(
      '/',
      authenticate({ roles: [Roles.Type.ADMIN] }),
      handle(async ({ res, db, params }) => {
        const result = await db.eventsDb.getEvents(params);
        res.send(result);
      }),
    );

    router.patch(
      '/',
      authenticate({ roles: [Roles.Type.ADMIN] }),
      handle(async ({ res, params, db }) => {
        const result = await db.eventsDb.changeState(params);
        res.send(result);
      }),
    );
    return router;
  }
}
