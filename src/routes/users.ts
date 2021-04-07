import { Router } from 'express';
import { handle, handleBasic } from '../middlewares/handler';
import { authenticate } from '../middlewares/auth-middleware';
import { UI_URL } from '../common/config';
import { checkRefreshToken, getRefreshCookieOptions } from '../common/express-utils';
import { Roles } from '../models/roles';

const REFRESH_TOKEN_NAME = 'refreshToken';
export class UsersRouter {
  public static async init(): Promise<Router> {
    const router = Router();

    router.get(
      '/',
      authenticate({ roles: [Roles.Type.ADMIN] }),
      handle(async ({ res, db, params }) => {
        const users = await db.usersDb.getUsers(params);
        res.send(users);
      }),
    );

    router.post(
      '/register',
      handle(async ({ res, db, params, emailDispatcher }) => {
        res.status(201).send(await db.usersDb.createUser(params, emailDispatcher));
      }),
    );

    router.post(
      '/authenticate',
      handle(async ({ db, res, params, req }) => {
        const response = await db.usersDb.login(params, req.ip, db.refreshTokensDb);
        res.cookie(REFRESH_TOKEN_NAME, response.refreshToken, getRefreshCookieOptions());
        res.send({ token: response.token });
      }),
    );

    router.post(
      '/refresh-token',
      handleBasic(async ({ res, db, req }) => {
        const token = req.cookies[REFRESH_TOKEN_NAME];
        checkRefreshToken(token);
        const result = await db.refreshTokensDb.refreshToken(token, req.ip, db.usersDb);
        res.cookie(REFRESH_TOKEN_NAME, result.refreshToken, getRefreshCookieOptions());
        res.send({ token: result.token });
      }),
    );

    router.post(
      '/revoke-token',
      authenticate(),
      handle(async ({ req, db, res }) => {
        const token = req.cookies[REFRESH_TOKEN_NAME];
        checkRefreshToken(token);
        await db.refreshTokensDb.revokeToken(token, req.ip);
        res.sendStatus(200);
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
        const uiUrl = UI_URL;
        if (!uiUrl) {
          res.sendStatus(500);
          return;
        }
        await db.usersDb.confirmUser(req.params.confirmationCode);

        // should include env var
        res.redirect(uiUrl);
      }),
    );
    return router;
  }
}
