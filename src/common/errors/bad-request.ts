import { BaseError } from "./baser-error";

export class BadRequestError extends BaseError{
    public errorCode = 400;

    public constructor (message?: string, errorObject?: unknown) {
        super(message, errorObject)
    }

}