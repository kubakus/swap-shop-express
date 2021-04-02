import { Response, Request, NextFunction, RequestHandler } from 'express';
import { Roles } from '../models/roles';
import { Database } from '../common/database';
import { BaseError } from '../common/errors/base-error';
import { EmailDispatcher } from '../common/email-dispatcher';

export interface ExpressOptions {
  req: Request;
  res: Response;
  next: NextFunction;
}

export interface RequestArgsBase extends Record<string, unknown> {
  db: Database;
}

export interface RequestArgs extends RequestArgsBase {
  params: Record<string, unknown>;
  roles: Roles.Type[];
  userId: string;
  emailDispatcher: EmailDispatcher;
}

export type RequestCallback = (options: ExpressOptions & RequestArgs) => Promise<void>;

export type BaseRequestCallback<T extends RequestArgsBase = RequestArgsBase> = (
  options: ExpressOptions & T,
) => Promise<void>;

type ExtractFunction<T extends RequestArgsBase = RequestArgsBase> = (
  req: Request,
  res: Response,
  next: NextFunction,
) => T;

/**
 * Handle should only be used after authenticate endpoint - that's where roles and userId fields get populated
 * @param callback
 * @param extractFunction
 */
export function handler<T extends RequestArgsBase>(
  callback: BaseRequestCallback<T>,
  extractFunction: ExtractFunction<T>,
): RequestHandler {
  return (req, res, next) => {
    const opt = { req, res, next };
    callback({
      ...opt,
      ...extractFunction(req, res, next),
    }).catch((error: Error) => {
      console.error('Request failed', error);

      if (error instanceof BaseError) {
        res.status(error.errorCode);
      } else {
        res.status(500);
      }

      if (error instanceof BaseError && error.errorObject) {
        res.send({ message: error.message, errorObject: error.errorObject });
      } else {
        res.send({ message: error.message });
      }
    });
  };
}

export function handleBasic(callback: BaseRequestCallback): RequestHandler {
  const extractor: ExtractFunction = (_req, res) => {
    return {
      db: res.locals.db,
    };
  };
  return handler(callback, extractor);
}

export function handle(callback: RequestCallback): RequestHandler {
  const extractor: ExtractFunction<RequestArgs> = (req, res) => {
    return {
      db: res.locals.db,
      // TODO makes sure that all it takes
      params: isActionMethod(req) ? req.body : req.query,
      roles: res.locals.roles,
      userId: res.locals.id,
      emailDispatcher: res.locals.emailDispatcher,
    };
  };

  return handler(callback, extractor);
}

function isActionMethod(req: Request): boolean {
  const actionMethods = ['POST', 'PUT', 'PATCH'];
  return actionMethods.includes(req.method);
}
