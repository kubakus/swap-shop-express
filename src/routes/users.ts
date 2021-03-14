import { Router } from 'express';
import { handle } from '../middlewares/handler';
import { authenticate } from '../middlewares/auth-middleware';
import { UI_URL } from '../common/config';
import { checkRefreshToken, getRefreshCookieOptions } from '../common/express-utils';

const REFRESH_TOKEN_NAME = 'refreshToken';
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
      handle(async ({ db, res, params, req }) => {
        const response = await db.usersDb.login(params, req.ip, db.refreshTokensDb);
        res.cookie(REFRESH_TOKEN_NAME, response.refreshToken, getRefreshCookieOptions());
        res.send({ token: response.token });
      }),
    );

    router.post(
      '/refresh-token',
      handle(async ({ res, db, req, roles }) => {
        const token = req.cookies[REFRESH_TOKEN_NAME];
        checkRefreshToken(token);
        const result = await db.refreshTokensDb.refreshToken(token, req.ip, roles);
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
        await db.usersDb.confirmUser(req.params.confirmationCode);
        // should include env var
        res.redirect(UI_URL);
      }),
    );
    return router;
  }
}
