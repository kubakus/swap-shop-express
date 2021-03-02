import { Router } from 'express';
import { handle } from '../middlewares/handler';
import { authenticate } from '../middlewares/auth-middleware';

export class UsersRouter {
  public static async init(): Promise<Router> {
    const router = Router();
    router.post(
      '/register',
      handle(async ({ res, db, params }) => {
        res.status(201).send(await db.usersDb.createUser(params));
      }),
    );

    router.post(
      '/authenticate',
      handle(async ({ db, res, params }) => {
        const response = await db.usersDb.login(params);
        res.send(response);
      }),
    );

    router.get(
      '/me',
      authenticate(),
      handle(async ({ db, userId, res }) => {
        const result = await db.usersDb.getUserInfo(userId);
        res.send(result);
      }),
    );
    return router;
  }
}
