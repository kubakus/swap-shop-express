import { Db, ObjectId } from "mongodb";
import { Base } from "../../models/base";
import { Users } from "../../models/users";
import { COLLECTION_USERS, SECRET_KEY, TOKEN_TIMEOUT } from "../config";
import  Bcryptjs from 'bcryptjs';
import Jwt from 'jsonwebtoken';
import { Roles } from "../../models/roles";
import Validator from 'validatorjs';
import { BadRequestError } from "../errors/bad-request";


type User = Omit<Users.User, 'id'> & { _id: ObjectId}

interface TokenResponse {
    token: string;
    expiresIn: number;
}

const LOGIN_VALIDATION_RULE: Validator.Rules = {
    email: 'required|email',
    password: 'required'
} 

// TODO add constraints on password
const REGISTER_VALIDATION_RULE: Validator.Rules = {
    ...LOGIN_VALIDATION_RULE,
    password: 'required',
    name: 'required|string'

}
export class UsersDb {
    private readonly db: Db;
    
    public constructor(db: Db) {
        this.db = db;
    }

    public async createUser(params: unknown): Promise<Base.CreateResponse> {
        const validation = new Validator(params, REGISTER_VALIDATION_RULE)
        const isValid = validation.check();
        if (!isValid) {
            throw new BadRequestError("Failed to validate request", validation.errors.all());
        }
        
        const collection = this.db.collection(COLLECTION_USERS);
        const salt = await Bcryptjs.genSalt(10);
        const request = params as Users.CreateRequest;
        const doc: Users.CreateDoc = {
            ...request,
            password: await Bcryptjs.hash(request.password, salt),
            role: Roles.Type.USER,
        }
        const result =  await collection.insertOne(doc);
        if (!result.result.ok) {
            throw new Error("Failed to insert new role");
        }
        return { id: result.insertedId };
    }

    public async login(params: unknown): Promise<TokenResponse> {
        const validation = new Validator(params, LOGIN_VALIDATION_RULE);
        const isValid = validation.check()
        if (!isValid) {
            throw new BadRequestError("Failed to validate request", validation.errors.all());
        }
        const loginDetails = params as Users.LoginDetails
        const collection = this.db.collection(COLLECTION_USERS);
        const user: User = await collection.findOne({ email: loginDetails.email });
        // Not sure if server should indicate what went wrong here,
        // safer to throw the same message in both instances
        if (!user) {
            throw new BadRequestError("Either password or email was invalid");
        }

        const isPasswordValid = await Bcryptjs.compare(loginDetails.password, user.password)
        if (!isPasswordValid) {
            throw new BadRequestError("Either password or email was invalid")
        }

        const token = Jwt.sign({ id: user._id.toHexString(), role: user.role }, SECRET_KEY, { expiresIn: TOKEN_TIMEOUT });
        return { token, expiresIn: TOKEN_TIMEOUT };
    }
}