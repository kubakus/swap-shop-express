import { Db, ObjectId } from 'mongodb';
import { Base } from '../../models/base';
import { Users } from '../../models/users';
import {
  COLLECTION_USERS,
  EMAIL,
  EMAIL_PASSWORD,
  SECRET_KEY,
  TOKEN_TIMEOUT,
  UI_URL,
} from '../config';
import Bcryptjs from 'bcryptjs';
import Jwt from 'jsonwebtoken';
import { Roles } from '../../models/roles';
import Validator from 'validatorjs';
import { BadRequestError } from '../errors/bad-request';
import { ConflictError } from '../errors/conflict';
import { UnauthorizedError } from '../errors/unauthorized';
import { randomBytes } from 'crypto';
import { createTransport } from 'nodemailer';

type User = Omit<Users.User, 'id'> & { _id: ObjectId };
// Don't send password back to user or token
type UserResponse = Omit<Users.User, 'password' | 'token'>;

interface TokenResponse {
  token: string;
  expiresIn: number;
}

const LOGIN_VALIDATION_RULE: Validator.Rules = {
  email: 'required|email',
  password: 'required',
};

// TODO add constraints on password
const REGISTER_VALIDATION_RULE: Validator.Rules = {
  ...LOGIN_VALIDATION_RULE,
  password: 'required',
  name: 'required|string',
};
export class UsersDb {
  private readonly db: Db;

  public constructor(db: Db) {
    this.db = db;
  }

  public async createUser(params: unknown): Promise<Base.CreateResponse> {
    const validation = new Validator(params, REGISTER_VALIDATION_RULE);
    const isValid = validation.check();
    if (!isValid) {
      throw new BadRequestError('Failed to validate request', validation.errors.all());
    }

    const collection = this.db.collection(COLLECTION_USERS);
    const salt = await Bcryptjs.genSalt(10);
    const request = params as Users.CreateRequest;

    const exist = await collection.findOne({ email: request.email });
    if (exist) {
      throw new ConflictError('Email is present in the system');
    }

    const confirmationToken = randomBytes(128).toString('hex');

    const doc: Users.CreateDoc = {
      ...request,
      password: await Bcryptjs.hash(request.password, salt),
      role: Roles.Type.USER,
      isVerified: false,
      token: confirmationToken,
    };

    const result = await collection.insertOne(doc);
    if (!result.result.ok) {
      throw new Error('Failed to insert new role');
    }

    const transport = createTransport({
      service: 'Gmail',
      auth: {
        user: EMAIL,
        pass: EMAIL_PASSWORD,
      },
    });

    await transport.sendMail({
      from: EMAIL,
      to: request.email,
      subject: 'Email confirmation',
      html: `<h1>Email Confirmation</h1>
                <h2>Hello ${request.name}</h2>
                <p>Thank you for registering with SwapShop! Please confirm your email by clicking the link below. It will redirect you to login page</p>
                <a href=${UI_URL}/api/auth/confirm/${confirmationToken}>Click here to confirm your email</a>
                </div>`,
    });

    return { id: result.insertedId };
  }

  public async login(params: unknown): Promise<TokenResponse> {
    const validation = new Validator(params, LOGIN_VALIDATION_RULE);
    const isValid = validation.check();
    if (!isValid) {
      throw new BadRequestError('Failed to validate request', validation.errors.all());
    }
    const loginDetails = params as Users.LoginDetails;
    const collection = this.db.collection<User>(COLLECTION_USERS);
    const user: User | null = await collection.findOne({ email: loginDetails.email });
    // Not sure if server should indicate what went wrong here,
    // safer to throw the same message in both instances
    if (!user) {
      throw new BadRequestError('Either password or email was invalid');
    }

    const isPasswordValid = await Bcryptjs.compare(loginDetails.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestError('Either password or email was invalid');
    }

    if (!user.isVerified) {
      throw new UnauthorizedError('User is not verified');
    }

    const token = Jwt.sign({ id: user._id.toHexString(), role: user.role }, SECRET_KEY, {
      expiresIn: TOKEN_TIMEOUT,
    });
    return { token, expiresIn: TOKEN_TIMEOUT };
  }

  public async getUserInfo(userId: string): Promise<UserResponse> {
    const collection = this.db.collection(COLLECTION_USERS);
    const userInfo = await collection.findOne<UserResponse>(
      {
        _id: new ObjectId(userId),
      },
      {
        projection: {
          id: { $convert: { input: '$_id', to: 'string' } },
          name: 1,
          email: 1,
          _id: 0,
        },
      },
    );
    if (!userInfo) {
      throw new BadRequestError('User does not exist');
    }

    return userInfo;
  }

  public async confirmUser(confirmationToken: string): Promise<void> {
    const collection = this.db.collection(COLLECTION_USERS);
    const user = await collection.findOne<User>({
      token: confirmationToken,
    });
    if (!user) {
      throw new BadRequestError('User does not exist');
    }

    await collection.updateOne(
      { _id: user._id },
      {
        $set: { isVerified: true },
      },
    );
  }
}
