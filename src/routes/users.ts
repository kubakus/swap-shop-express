import { Router } from 'express';
import { handle, handleBasic } from '../middlewares/handler';
import { authenticate } from '../middlewares/auth-middleware';
import { checkRefreshToken, getRefreshCookieOptions } from '../common/express-utils';
import { Roles } from '../models/roles';
import { Users } from '../models/users';
import { NotFoundError } from '../common/errors/not-found';

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
      handle(async ({ res, db, params, emailDispatcher, req }) => {
        const origin = req.headers.origin || req.hostname;
        res.status(201).send(await db.usersDb.createUser(params, emailDispatcher, origin));
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
        const f: Users.Request = { id: userId };
        const result = await db.usersDb.getUsers(f);
        if (!result.length) {
          throw new NotFoundError(`User ${userId} does not exist`);
        }
        res.send(result[0]);
      }),
    );

    router.get(
      '/confirm/:confirmationCode',
      handle(async ({ req, res, db }) => {
        await db.usersDb.confirmUser(req.params.confirmationCode);
        const origin = req.headers.origin || req.hostname;
        res.location(origin);
        res.redirect('/login');
      }),
    );
    return router;
  }
}
