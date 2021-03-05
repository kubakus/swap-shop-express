import { Router } from 'express';
import { handle } from '../middlewares/handler';
import { authenticate } from '../middlewares/auth-middleware';
import { UI_URL } from '../common/config';

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

    router.get(
      '/confirm/:confirmationCode',
      handle(async ({ req, res, db }) => {
        await db.usersDb.confirmUser(req.params.confirmationCode);
        // should include env var
        res.redirect(UI_URL);
      }),
    );
    return router;
  }
}
