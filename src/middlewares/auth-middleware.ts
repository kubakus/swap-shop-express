import { RequestHandler } from 'express';
import { handleBasic } from './handler';
import { TokenExpiredError } from 'jsonwebtoken';
import { SECRET_KEY } from '../common/config';
import { Roles } from '../models/roles';
import { BadRequestError } from '../common/errors/bad-request';
import { ForbiddenError } from '../common/errors/forbidden';
import { UnauthorizedError } from '../common/errors/unauthorized';
import { verifyJwtToken } from '../common/jwt-utils';

const TOKEN_HEADER = 'authorization';
export interface AuthOptions {
  roles?: Roles.Type[];
}

export function authenticate(options?: AuthOptions): RequestHandler {
  return handleBasic(async ({ req, res, next, db }) => {
    const bearer = req.headers[TOKEN_HEADER];
    if (!bearer) {
      throw new BadRequestError('Token not provided');
    }
    if (typeof bearer !== 'string') {
      throw new BadRequestError('Token not set in the header');
    }
    const [, token] = bearer.split('Bearer ');

    try {
      const tokenObject = verifyJwtToken(token, SECRET_KEY);

      res.locals.id = tokenObject.sub;
      // Don't trust the token with roles, fetch them directly from the database.
      // Not sure if this is correct
      const userRoles = await db.usersDb.getUserRoles(tokenObject.sub);
      res.locals.roles = userRoles;

      if (options && options.roles) {
        if (!userRoles.some((userRole) => options.roles?.includes(userRole))) {
          throw new ForbiddenError('You do not have permissions to access this resource');
        }
      }
    } catch (err) {
      console.error(`Error occurred while authenticating a user`, err);
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedError('Token expired!');
      } else {
        throw new UnauthorizedError('Invalid token!', err.errorObject);
      }
    }
    next();
  });
}
