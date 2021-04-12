import { BaseError } from './base-error';

export class NotFoundError extends BaseError {
  public errorCode = 404;

  public constructor(message?: string, errorObject?: unknown) {
    super(message, errorObject);
  }
}
