import { Response, Request, NextFunction, RequestHandler, } from "express";
import { Roles } from "../models/roles";
import { Database } from "./database";
import { BaseError } from "./errors/baser-error";

export interface ExpressOptions {
    res: Response;
    req: Request;
    next: NextFunction
}

export interface RequestArgsBase extends Record<string, unknown> {
    db: Database;
}

export interface RequestArgs extends RequestArgsBase {
    params: Record<string, unknown>;
    role: Roles.Type;
}

export type RequestCallback = (options: ExpressOptions & RequestArgs) => Promise<void>;


// const x = <T extends RequestCallbackBase>(callback: T, extractFunction: ExtractFunction): RequestHandler => {
//     return (req, res, next) => {
//         const options = { req, res, next };
//         return callback({
//             ...options,
//             ...extractFunction(req, res, next)
//         })
//     }
// } 


export function handle(callback: RequestCallback): RequestHandler {
    // TODO add here extractor like, extract db etc
    const extractFunction = (req: Request, res: Response, _next: NextFunction): RequestArgs => {
        return { 
            db: res.locals.db,
            params: isActionMethod(req) ? req.body : {},
            role: res.locals.role,
        }

    } 
    return (req, res, next) => {
        const opt = { req, res, next };
        callback({
            ...opt,
            ...extractFunction(req, res, next)
        }).catch((error: Error) => {
            console.error("Request failed", error);

            if (error instanceof BaseError) {
                res.status(error.errorCode)
            } else {
                res.status(500)
            }

            if (error instanceof BaseError && error.errorObject) {
                res.send({ message: error.message, errorObject: error.errorObject})
            } else {
                res.send({ message: error.message })
            }
        })
    }
}

function isActionMethod(req: Request): boolean {
    const actionMethods = ['POST', 'PUT', 'PATCH'];
    return actionMethods.includes(req.method);
}