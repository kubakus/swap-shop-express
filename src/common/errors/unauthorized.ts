import { BaseError } from './base-error';

export class UnauthorizedError extends BaseError {
  public errorCode = 401;

  public constructor(message: string, errorObject?: unknown) {
    super(message, errorObject);
  }
}
