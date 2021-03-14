import { BaseError } from './base-error';

export class ForbiddenError extends BaseError {
  public errorCode = 403;

  public constructor(message?: string, errorObject?: unknown) {
    super(message, errorObject);
  }
}
