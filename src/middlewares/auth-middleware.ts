import { RequestHandler } from 'express';
import { handleBasic } from './handler';
import Jwt, { TokenExpiredError } from 'jsonwebtoken';
import { SECRET_KEY } from '../common/config';
import { Roles } from '../models/roles';
import { BadRequestError } from '../common/errors/bad-request';
import { ForbiddenError } from '../common/errors/forbidden';
import { UnauthorizedError } from '../common/errors/unauthorized';

const TOKEN_HEADER = 'authorization';
export interface AuthOptions {
  roles?: Roles.Type[];
}

export interface TokenPayload {
  iat: number;
  sub: string;
  roles: Roles.Type[];
  exp: number;
}

export function authenticate(options?: AuthOptions): RequestHandler {
  return handleBasic(async ({ req, res, next }) => {
    const bearer = req.headers[TOKEN_HEADER];
    if (!bearer) {
      throw new BadRequestError('Token not provided');
    }
    if (typeof bearer !== 'string') {
      throw new BadRequestError('Token not set in the header');
    }

    const [, token] = bearer.split('Bearer ');
    try {
      const decoded = Jwt.verify(token, SECRET_KEY);
      if (typeof decoded !== 'object') {
        throw new Error('Failed to decode token');
      }
      const tokenObject = (decoded as unknown) as TokenPayload;
      res.locals.id = tokenObject.sub;
      res.locals.roles = tokenObject.roles;

      if (options && options.roles) {
        if (!tokenObject.roles.some((userRole) => options.roles?.includes(userRole))) {
          throw new ForbiddenError('You do not have permissions to access this resource');
        }
      }
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedError('Token expired!');
      } else {
        throw new UnauthorizedError('Invalid token!');
      }
    }
    next();
  });
}
