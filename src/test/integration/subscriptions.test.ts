import { Db, MongoClient, ObjectId } from 'mongodb';
import { MONGO_URI, DB_NAME, COLLECTION_SUBSCRIPTIONS } from '../../common/config';
import { Subscriptions } from '../../models/subscriptions';
import {
  ADMIN_ROLES,
  createOptions,
  createToken,
  TEST_ADMIN_ID,
  TEST_API_ROOT,
  TEST_USER_1_ID,
  USER_ROLES,
} from '../helpers';
import { describe, test, beforeAll, afterAll, expect } from '@jest/globals';

import Fetch from 'node-fetch';

type RawSubscription = Omit<Subscriptions.Subscription, 'id'> & { _id: ObjectId };

describe('Subscription database testing', () => {
  const SUBSCRIPTIONS_ROOT = `${TEST_API_ROOT}/subscriptions`;
  const ADMIN_TOKEN = createToken(TEST_ADMIN_ID, ADMIN_ROLES);
  const USER_1_TOKEN = createToken(TEST_USER_1_ID, USER_ROLES);

  const sub: RawSubscription = {
    _id: new ObjectId(),
    date: new Date(Date.now() + 1000 * 60),
    header: 'head',
    footer: 'one two three',
    createdBy: 'fake userid',
    createdDate: new Date(),
    updatedBy: 'fake userid',
    updatedDate: new Date(),
    state: Subscriptions.State.FAILED,
  };

  const mongo = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  let db: Db;

  beforeAll(async () => {
    await mongo.connect();
    db = mongo.db(DB_NAME);

    await db.collection(COLLECTION_SUBSCRIPTIONS).insertOne(sub);
  });

  afterAll(async () => {
    await mongo.close();
  });

  describe('POST /', () => {
    test('User cannot create subscriptions (403)', async () => {
      const request: Subscriptions.CreateRequest = {
        header: 'This is header',
        footer: 'This is footer',
        date: new Date(Date.now() + 1000 * 60 * 60 * 60),
      };

      const response = await Fetch(
        SUBSCRIPTIONS_ROOT,
        createOptions(USER_1_TOKEN, 'POST', request),
      );
      expect(response.status).toBe(403);
      const error = await response.json();
      expect(error.message).toEqual(
        expect.stringContaining('You do not have permissions to access this resource'),
      );
      db;
      ADMIN_TOKEN;
    });

    test('Admin can create subscriptions', async () => {
      const request: Subscriptions.CreateRequest = {
        header: 'This new is header',
        footer: 'This new is footer',
        date: new Date(Date.now() + 1000 * 60 * 60 * 60),
      };
      const response = await Fetch(SUBSCRIPTIONS_ROOT, createOptions(ADMIN_TOKEN, 'POST', request));
      // 500 due to missing transport settings
      expect(response.status).toBe(500);
      const error = await response.json();
      expect(error.message).toEqual(
        expect.stringContaining('Missing transport settings. Email dispatcher disabled'),
      );
      const created = await db
        .collection(COLLECTION_SUBSCRIPTIONS)
        .findOne<RawSubscription>({ header: request.header, footer: request.footer });
      expect(created?.footer).toEqual(request.footer);
      expect(created?.header).toEqual(request.header);
      expect(created?.state).toEqual('AwaitingDispatch');
    });
  });

  describe('GET /', () => {
    test('User cannot fetch subscriptions (403)', async () => {
      const response = await Fetch(
        `${SUBSCRIPTIONS_ROOT}?header=This new is header`,
        createOptions(USER_1_TOKEN),
      );
      expect(response.status).toBe(403);
      const error = await response.json();
      expect(error.message).toEqual(
        expect.stringContaining('You do not have permissions to access this resource'),
      );
    });

    test('Admin can fetch subscriptions', async () => {
      const response = await Fetch(
        `${SUBSCRIPTIONS_ROOT}?state=${Subscriptions.State.FAILED}`,
        createOptions(ADMIN_TOKEN),
      );
      expect(response.status).toBe(200);
      const data: Subscriptions.Subscription[] = await response.json();
      const result = data[0];
      expect(result).toBeDefined();
      expect(result.id).toBe(sub._id.toHexString());
    });
  });
});
