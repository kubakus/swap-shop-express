import { describe, test, beforeAll, afterAll, expect } from '@jest/globals';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { COLLECTION_USERS, DB_NAME, MONGO_URI } from '../../common/config';
import { Users } from '../../models/users';
import { createToken, TEST_USER_1_ID, USER_ROLES, TEST_API_ROOT, createOptions } from '../helpers';
import Fetch from 'node-fetch';
import { BaseError } from '../../common/errors/base-error';
import { USER_1_EMAIL, USER_1_PASSWORD } from '../seed-db';
import { Roles } from '../../models/roles';

type RawUser = Omit<Users.User, 'id'> & {
  _id: ObjectId;
};

type BasicUserWithoutAuditInfo = Omit<
  Users.UserBasic,
  'createdDate' | 'updatedDate' | 'createdBy' | 'updatedBy'
>;

describe('Users database testing', () => {
  const USERS_ROOT = `${TEST_API_ROOT}/auth`;
  const USER_1_TOKEN = createToken(TEST_USER_1_ID, USER_ROLES);

  const NEW_USER_INFO: Users.CreateRequest = {
    name: 'new user',
    email: 'neww@email.com',
    password: 'This is great password',
  };

  const mongo = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  let db: Db;
  let id: string;
  let confirmationCode: string;

  beforeAll(async () => {
    await mongo.connect();
    db = mongo.db(DB_NAME);
  });

  afterAll(async () => {
    await mongo.close();
  });

  describe('POST /register', () => {
    test('User can register into the system', async () => {
      const response = await Fetch(`${USERS_ROOT}/register`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify(NEW_USER_INFO),
      });

      expect(response.status).toBe(500);
      const error: Error = await response.json();
      const expectedErrorMessage = 'Missing swapshop email address. Email dispatcher disabled';
      expect(error.message).toEqual(expect.stringContaining(expectedErrorMessage));
      const newUser = await db
        .collection(COLLECTION_USERS)
        .findOne<RawUser>({ email: NEW_USER_INFO.email });
      expect(newUser).not.toBeNull();
      expect(newUser?.isVerified).toBe(false);
      if (newUser) {
        id = newUser._id.toHexString();
        confirmationCode = newUser.token;
      }
    });

    test('Request rejected if email is already present in the system (409)', async () => {
      const request: Users.CreateRequest = {
        name: 'another new user',
        email: 'neww@email.com',
        password: 'This is great password 2',
      };
      const response = await Fetch(`${USERS_ROOT}/register`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      expect(response.status).toBe(409);
    });
  });

  describe('POST /authenticate', () => {
    test('Unconfirmed users cannot login into the system (401)', async () => {
      const request: Users.LoginDetails = {
        email: NEW_USER_INFO.email,
        password: NEW_USER_INFO.password,
      };
      const response = await Fetch(`${USERS_ROOT}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      expect(response.status).toBe(401);
      const error: BaseError = await response.json();
      const expectedErrorMessage = 'User is not verified';
      expect(error.message).toEqual(expect.stringContaining(expectedErrorMessage));
    });

    test('User cannot login into the system using incorrect password (400)', async () => {
      const request: Users.LoginDetails = {
        email: NEW_USER_INFO.email,
        password: 'incorrect',
      };

      const response = await Fetch(`${USERS_ROOT}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.message).toEqual(expect.stringContaining('Credentials incorrect'));
    });

    test('User cannot login into the system using incorrect email (400)', async () => {
      const request: Users.LoginDetails = {
        email: 'notAnEmail',
        password: NEW_USER_INFO.password,
      };

      const response = await Fetch(`${USERS_ROOT}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.message).toEqual(expect.stringContaining('Failed to validate request'));
    });

    test('User can login into the system', async () => {
      const request: Users.LoginDetails = {
        email: USER_1_EMAIL,
        password: USER_1_PASSWORD,
      };

      const response = await Fetch(`${USERS_ROOT}/authenticate`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      expect(response.status).toBe(200);
      const cookie = response.headers.get('set-cookie');
      expect(cookie).not.toBeNull();
    });
  });

  describe('GET /confirm/:confirmationCode', () => {
    test('User can confirm their email', async () => {
      const response = await Fetch(`${USERS_ROOT}/confirm/${confirmationCode}`);
      expect(response.redirected).toBe(true);
      expect(response.url.endsWith('/login')).toBe(true);
      const user = await db
        .collection(COLLECTION_USERS)
        .findOne<RawUser>({ _id: new ObjectId(id) });
      expect(user?.isVerified).toBe(true);
    });
  });

  describe('GET /me', () => {
    test('Users can get information about themselves', async () => {
      const response = await Fetch(`${USERS_ROOT}/me`, createOptions(USER_1_TOKEN));
      const expected: BasicUserWithoutAuditInfo = {
        id: TEST_USER_1_ID,
        email: USER_1_EMAIL,
        name: 'user1',
        isVerified: true,
        roles: [Roles.Type.USER],
      };
      const received = await response.json();
      expect(received).toMatchObject(expected);
    });
  });
});
