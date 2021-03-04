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
      handle(async ({ res, db, params }) => {
        const result = await db.eventsDb.createEvent(params);
        res.status(201).send(result);
      }),
    );
    return router;
  }
}
