import { RequestHandler } from 'express';
import { handleBasic } from '../common/handler';
import Jwt, { TokenExpiredError } from 'jsonwebtoken';
import { SECRET_KEY } from '../common/config';
import { Users } from '../models/users';
import { Roles } from '../models/roles';
import { BadRequestError } from '../common/errors/bad-request';

export interface AuthOptions {
  roles?: Roles.Type[];
}

export function authenticate(options?: AuthOptions): RequestHandler {
  return handleBasic(async ({ req, res, next }) => {
    const token = req.headers['x-access-token'];
    if (!token) {
      throw new Error('Token not provided');
    }
    if (typeof token !== 'string') {
      throw new Error('Token not set in the header');
    }

    try {
      const decoded = Jwt.verify(token, SECRET_KEY);
      if (typeof decoded !== 'object') {
        throw new Error('Failed to decode token');
      }
      const tokenObject = (decoded as unknown) as Users.Token;
      res.locals.id = tokenObject.id;
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
