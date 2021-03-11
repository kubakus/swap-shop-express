import { RequestHandler } from 'express';
import { handleBasic } from './handler';
import Jwt, { TokenExpiredError } from 'jsonwebtoken';
import { SECRET_KEY } from '../common/config';
import { Roles } from '../models/roles';
import { BadRequestError } from '../common/errors/bad-request';

const TOKEN_HEADER = 'authorization';
export interface AuthOptions {
  roles?: Roles.Type[];
}

export interface TokenPayload {
  iat: number;
  sub: string;
  role: Roles.Type;
  exp: number;
}

export function authenticate(options?: AuthOptions): RequestHandler {
  return handleBasic(async ({ req, res, next }) => {
    const bearer = req.headers[TOKEN_HEADER];
    if (!bearer) {
      throw new Error('Token not provided');
    }
    if (typeof bearer !== 'string') {
      throw new Error('Token not set in the header');
    }

    const [, token] = bearer.split('Bearer ');
    try {
      const decoded = Jwt.verify(token, SECRET_KEY);
      if (typeof decoded !== 'object') {
        throw new Error('Failed to decode token');
      }
      const tokenObject = (decoded as unknown) as TokenPayload;
      res.locals.id = tokenObject.sub;
      res.locals.role = tokenObject.role;

      if (options && options.roles) {
        if (!options.roles.includes(tokenObject.role)) {
          throw new BadRequestError('You do not have permission to access this resource');
        }
      }
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new Error('Token expired!');
      } else {
        throw new Error('Invalid token!');
      }
    }
    next();
  });
}
