import { describe, test, beforeAll, afterAll, expect } from '@jest/globals';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { COLLECTION_WANTED, DB_NAME, MONGO_URI } from '../../common/config';
import { ItemState } from '../../models/item-state';
import { Wanted } from '../../models/wanted';
import {
  createToken,
  TEST_ADMIN_ID,
  ADMIN_ROLES,
  TEST_USER_1_ID,
  USER_ROLES,
  TEST_API_ROOT,
  createOptions,
} from '../helpers';
import Fetch from 'node-fetch';
import { Base } from '../../models/base';

type RawWanted = Omit<Wanted.Wanted, 'id'> & { _id: ObjectId };
type RawWantedWithoutAuditDates = Omit<RawWanted, 'createdDate' | 'updatedDate'>;
type WantedWithoutAuditDates = Omit<Wanted.Wanted, 'createdDate' | 'updatedDate'>;
describe('Wanted database testing', () => {
  const WANTED_ROOT = `${TEST_API_ROOT}/wanted`;
  const ADMIN_TOKEN = createToken(TEST_ADMIN_ID, ADMIN_ROLES);
  ADMIN_TOKEN;
  const USER_1_TOKEN = createToken(TEST_USER_1_ID, USER_ROLES);
  const mongo = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  let db: Db;
  let id: string;
  const wanted: RawWantedWithoutAuditDates[] = [];

  beforeAll(async () => {
    await mongo.connect();
    db = mongo.db(DB_NAME);
    for (let i = 0; i < 10; i++) {
      const _id = new ObjectId();
      wanted.push({
        _id,
        itemName: `wanted ${i}`,
        info: `info ${i}`,
        state: ItemState.AWAITING_REVIEW,
        createdBy: 'fake user id',
        updatedBy: 'fake user id',
        email: `fake${i}@email.com`,
        deal: `deal ${i}`,
        userName: 'user 1',
      });
    }
    await db.collection(COLLECTION_WANTED).insertMany(wanted);
  });

  afterAll(async () => {
    await db
      .collection(COLLECTION_WANTED)
      .deleteMany({ _id: { $in: [...wanted.map((w) => w._id), new ObjectId(id)] } });
    await mongo.close();
  });

  describe('POST /wanted', () => {
    test('User can create n wanted', async () => {
      const request: Wanted.CreateRequest = {
        itemName: 'new item',
        email: 'fake@email.com',
        deal: 'new deal',
        info: 'info info',
        userName: 'fake user name',
      };

      const response = await Fetch(WANTED_ROOT, createOptions(USER_1_TOKEN, 'POST', request));
      expect(response.status).toBe(201);
      const baseResponse: Base.CreateResponse = await response.json();
      const expected: RawWantedWithoutAuditDates = {
        ...request,
        _id: new ObjectId(baseResponse.id),
        createdBy: TEST_USER_1_ID,
        updatedBy: TEST_USER_1_ID,
        state: ItemState.AWAITING_REVIEW,
      };

      const created = await db
        .collection(COLLECTION_WANTED)
        .findOne<RawWanted>({ _id: new ObjectId(baseResponse.id) });
      expect(created).toMatchObject(expected);
      id = baseResponse.id;
    });
  });

  describe('PATCH /wanted', () => {
    test('Admin can approve wanted', async () => {
      const request: Wanted.ChangeStateRequest = {
        ids: [id],
        transition: ItemState.APPROVED,
      };
      const response = await Fetch(WANTED_ROOT, createOptions(ADMIN_TOKEN, 'PATCH', request));
      expect(response.status).toBe(200);
      const expectedMatch: Base.MatchedCountResponse = {
        count: 1,
        matchedCount: 1,
      };

      const baseResponse: Base.MatchedCountResponse = await response.json();
      const updatedOffered = await db
        .collection(COLLECTION_WANTED)
        .findOne<RawWanted>({ _id: new ObjectId(id) });
      expect(expectedMatch).toEqual(baseResponse);
      expect(updatedOffered?.state).toBe(ItemState.APPROVED);
    });

    test('User cannot change state of wanted (403)', async () => {
      const request: Wanted.ChangeStateRequest = {
        ids: [id],
        transition: ItemState.AWAITING_REVIEW,
      };
      const response = await Fetch(WANTED_ROOT, createOptions(USER_1_TOKEN, 'PATCH', request));
      expect(response.status).toBe(403);
      const error = await response.json();
      expect(error.message).toEqual(
        expect.stringContaining('You do not have permissions to access this resource'),
      );
    });
  });

  describe('GET /wanted', () => {
    test('Admin can fetch wanted', async () => {
      const expected: WantedWithoutAuditDates = {
        id: wanted[0]._id.toHexString(),
        email: wanted[0].email,
        createdBy: wanted[0].createdBy,
        updatedBy: wanted[0].updatedBy,
        info: wanted[0].info,
        state: wanted[0].state,
        itemName: wanted[0].itemName,
        userName: wanted[0].userName,
        deal: wanted[0].deal,
      };

      const response = await Fetch(
        `${WANTED_ROOT}?itemName=${expected.itemName}`,
        createOptions(ADMIN_TOKEN),
      );
      expect(response.status).toBe(200);
      const result: Wanted.Wanted[] = await response.json();
      expect(result[0]).toMatchObject(expected);
    });

    test('User cannot fetch wanted', async () => {
      const response = await Fetch(
        `${WANTED_ROOT}?itemName=${wanted[0].itemName}`,
        createOptions(USER_1_TOKEN),
      );
      expect(response.status).toBe(403);
      const error = await response.json();
      expect(error.message).toEqual(
        expect.stringContaining('You do not have permissions to access this resource'),
      );
    });
  });
});
