import { describe, test, beforeAll, afterAll, expect } from '@jest/globals';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { COLLECTION_OFFERS, DB_NAME, MONGO_URI } from '../../common/config';
import { ItemState } from '../../models/item-state';
import { Offers } from '../../models/offers';
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

type RawOffer = Omit<Offers.Offer, 'id'> & { _id: ObjectId };
type RawOfferWithoutAuditDates = Omit<RawOffer, 'createdDate' | 'updatedDate'>;
type OfferWithoutAuditDates = Omit<Offers.Offer, 'createdDate' | 'updatedDate'>;
describe('Offers database testing', () => {
  const OFFERS_ROOT = `${TEST_API_ROOT}/offers`;
  const ADMIN_TOKEN = createToken(TEST_ADMIN_ID, ADMIN_ROLES);
  const USER_1_TOKEN = createToken(TEST_USER_1_ID, USER_ROLES);
  const mongo = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  let db: Db;
  let id: string;
  const offers: RawOfferWithoutAuditDates[] = [];

  beforeAll(async () => {
    await mongo.connect();
    db = mongo.db(DB_NAME);
    for (let i = 0; i < 10; i++) {
      const _id = new ObjectId();
      offers.push({
        _id,
        itemName: `offered ${i}`,
        info: `info ${i}`,
        state: ItemState.AWAITING_REVIEW,
        createdBy: 'fake user id',
        updatedBy: 'fake user id',
        email: `fake${i}@email.com`,
        deal: `deal ${i}`,
        userName: 'user 1',
      });
    }
    await db.collection(COLLECTION_OFFERS).insertMany(offers);
  });

  afterAll(async () => {
    await db
      .collection(COLLECTION_OFFERS)
      .deleteMany({ _id: { $in: [...offers.map((offer) => offer._id), new ObjectId(id)] } });
    await mongo.close();
  });

  describe('POST /offers', () => {
    test('User can create an offered', async () => {
      const request: Offers.CreateRequest = {
        itemName: 'new item',
        email: 'fake@email.com',
        deal: 'new deal',
        info: 'info info',
        userName: 'fake user name',
      };

      const response = await Fetch(OFFERS_ROOT, createOptions(USER_1_TOKEN, 'POST', request));
      expect(response.status).toBe(201);
      const baseResponse: Base.CreateResponse = await response.json();
      const expected: RawOfferWithoutAuditDates = {
        ...request,
        _id: new ObjectId(baseResponse.id),
        createdBy: TEST_USER_1_ID,
        updatedBy: TEST_USER_1_ID,
        state: ItemState.AWAITING_REVIEW,
      };

      const created = await db
        .collection(COLLECTION_OFFERS)
        .findOne<RawOffer>({ _id: new ObjectId(baseResponse.id) });
      expect(created).toMatchObject(expected);
      id = baseResponse.id;
    });
  });

  describe('PATCH /offers', () => {
    test('Admin can approve offers (403)', async () => {
      const request: Offers.ChangeStateRequest = {
        ids: [id],
        transition: ItemState.APPROVED,
      };
      const response = await Fetch(OFFERS_ROOT, createOptions(ADMIN_TOKEN, 'PATCH', request));
      expect(response.status).toBe(200);
      const expectedMatch: Base.MatchedCountResponse = {
        count: 1,
        matchedCount: 1,
      };

      const baseResponse: Base.MatchedCountResponse = await response.json();
      const updatedOffered = await db
        .collection(COLLECTION_OFFERS)
        .findOne<RawOffer>({ _id: new ObjectId(id) });
      expect(expectedMatch).toEqual(baseResponse);
      expect(updatedOffered?.state).toBe(ItemState.APPROVED);
    });

    test('User cannot change state of offered', async () => {
      const request: Offers.ChangeStateRequest = {
        ids: [id],
        transition: ItemState.AWAITING_REVIEW,
      };
      const response = await Fetch(OFFERS_ROOT, createOptions(USER_1_TOKEN, 'PATCH', request));
      expect(response.status).toBe(403);
      const error = await response.json();
      expect(error.message).toEqual(
        expect.stringContaining('You do not have permissions to access this resource'),
      );
    });
  });

  describe('GET /offers', () => {
    test('Admin can fetch offers', async () => {
      const expected: OfferWithoutAuditDates = {
        id: offers[0]._id.toHexString(),
        email: offers[0].email,
        createdBy: offers[0].createdBy,
        updatedBy: offers[0].updatedBy,
        info: offers[0].info,
        state: offers[0].state,
        itemName: offers[0].itemName,
        userName: offers[0].userName,
        deal: offers[0].deal,
      };

      const response = await Fetch(
        `${OFFERS_ROOT}?itemName=${expected.itemName}`,
        createOptions(ADMIN_TOKEN),
      );
      expect(response.status).toBe(200);
      const result: Offers.Offer[] = await response.json();
      expect(result[0]).toMatchObject(expected);
    });

    test('User cannot fetch offered (403)', async () => {
      const response = await Fetch(
        `${OFFERS_ROOT}?itemName=${offers[0].itemName}`,
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
