export abstract class BaseError extends Error {
  public abstract errorCode: number;
  public readonly errorObject?: unknown;

  public constructor(message?: string, errorObject?: unknown) {
    super(message);
    this.errorObject = errorObject;
  }
}
