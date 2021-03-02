import { BaseError } from './base-error';

export class BadRequestError extends BaseError {
  public errorCode = 400;

  public constructor(message?: string, errorObject?: unknown) {
    super(message, errorObject);
  }
}
