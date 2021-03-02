import { Response, Request, NextFunction, RequestHandler } from 'express';
import { Roles } from '../models/roles';
import { Database } from '../common/database';
import { BaseError } from '../common/errors/base-error';

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
  role: Roles.Type;
  userId: string;
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
      params: isActionMethod(req) ? req.body : {},
      role: res.locals.role,
      userId: res.locals.id,
    };
  };

  return handler(callback, extractor);
}

function isActionMethod(req: Request): boolean {
  const actionMethods = ['POST', 'PUT', 'PATCH'];
  return actionMethods.includes(req.method);
}
