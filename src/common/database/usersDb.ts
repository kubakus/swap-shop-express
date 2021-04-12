import { Db, ObjectId } from 'mongodb';
import { Base } from '../../models/base';
import { Users } from '../../models/users';
import { COLLECTION_USERS, SECRET_KEY, TOKEN_TIMEOUT, UI_URL } from '../config';
import Bcryptjs from 'bcryptjs';
import { Roles } from '../../models/roles';
import Validator from 'validatorjs';
import { BadRequestError } from '../errors/bad-request';
import { ConflictError } from '../errors/conflict';
import { UnauthorizedError } from '../errors/unauthorized';
import { randomBytes } from 'crypto';
import { createJwtToken } from '../jwt-utils';
import { RefreshTokensDb } from './refreshTokensDb';
import { Tokens } from '../../models/tokens';
import { createMatchFilter, createTrimmer } from '../mongo-utils';
import { AUDIT_FILTERS } from '../../models/filters';
import { EmailDispatcher } from '../email-dispatcher';

type User = Omit<Users.User, 'id'> & { _id: ObjectId };

const LOGIN_VALIDATION_RULE: Validator.Rules = {
  email: 'required|email',
  password: 'required',
};

// TODO add constraints on password
const REGISTER_VALIDATION_RULE: Validator.Rules = {
  ...LOGIN_VALIDATION_RULE,
  password: 'required|min:8',
  name: 'required|string',
};
export class UsersDb {
  private readonly db: Db;

  public constructor(db: Db) {
    this.db = db;
  }

  public async getUsers(params: unknown): Promise<Users.UserBasic[]> {
    const collection = this.db.collection(COLLECTION_USERS);
    const request = params as Users.Request;
    const cursor = collection.aggregate<Users.UserBasic>(this.createUsersPipeline(request), {
      allowDiskUse: true,
    });
    return cursor.toArray();
  }

  public async createUser(
    params: unknown,
    emailDispatcher: EmailDispatcher,
  ): Promise<Base.CreateResponse> {
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
      roles: [Roles.Type.USER],
      isVerified: false,
      token: confirmationToken,
    };

    const result = await collection.insertOne(doc);
    if (!result.result.ok) {
      throw new Error('Failed to insert new role');
    }

    const url = UI_URL;
    if (!url) {
      throw new Error('Missing UI URL. Creation of new users disabled');
    }
    await emailDispatcher.createConfirmEmail(request.email, request.name, confirmationToken, url);

    return { id: result.insertedId };
  }

  public async login(
    params: unknown,
    ipAddress: string,
    tokenDb: RefreshTokensDb,
  ): Promise<Tokens.TokenResponse> {
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
    // NOTE: UI is checking against that message, if changing, don't forget to change it there as well
    if (!user) {
      throw new BadRequestError('Credentials incorrect');
    }

    const isPasswordValid = await Bcryptjs.compare(loginDetails.password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestError('Credentials incorrect');
    }

    if (!user.isVerified) {
      throw new UnauthorizedError('User is not verified');
    }
    const token = createJwtToken(user._id.toHexString(), user.roles, SECRET_KEY, TOKEN_TIMEOUT);
    const refreshToken = await tokenDb.createNewRefreshToken(user._id.toHexString(), ipAddress);
    return { token, refreshToken };
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

  public async getUserRoles(userId: string): Promise<Roles.Type[]> {
    const collection = this.db.collection(COLLECTION_USERS);
    const result = await collection.findOne<User>({ _id: new ObjectId(userId) });
    if (!result) {
      throw new BadRequestError('User does not exist');
    }
    return result.roles;
  }

  public createUsersPipeline(options: Users.Request): Record<string, unknown>[] {
    const pipeline = [];

    pipeline.push(
      ...[
        {
          $match: createMatchFilter<Users.Request>(
            [
              { name: 'email', type: 'string' },
              {
                name: 'roles',
                type: 'string',
              },
              ...AUDIT_FILTERS,
            ],
            options,
          ),
        },
        {
          $project: {
            password: 0,
            token: 0,
          },
        },
      ],
      ...createTrimmer(),
    );
    return pipeline;
  }
}
