import { BaseError } from './base-error';

export class ConflictError extends BaseError {
  public errorCode = 409;

  public constructor(message?: string, errorObject?: unknown) {
    super(message, errorObject);
  }
}
