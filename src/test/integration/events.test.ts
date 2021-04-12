import { describe, test, beforeAll, afterAll, expect } from '@jest/globals';
import { Events } from '../../models/events';
import {
  ADMIN_ROLES,
  createOptions,
  createToken,
  TEST_ADMIN_ID,
  TEST_API_ROOT,
  TEST_USER_1_ID,
  USER_ROLES,
} from '../helpers';
import Fetch from 'node-fetch';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { COLLECTION_EVENTS, DB_NAME, MONGO_URI } from '../../common/config';
import { Base } from '../../models/base';
import { ItemState } from '../../models/item-state';

type RawEvent = Omit<Events.Event, 'id'> & { _id: ObjectId };
type RawEventWithoutAuditDates = Omit<RawEvent, 'createdDate' | 'updatedDate'>;
type EventWithoutAuditDates = Omit<Events.Event, 'createdDate' | 'updatedDate'>;

describe('Events database testing', () => {
  const EVENTS_ROOT = `${TEST_API_ROOT}/events`;

  const ADMIN_TOKEN = createToken(TEST_ADMIN_ID, ADMIN_ROLES);
  const USER_1_TOKEN = createToken(TEST_USER_1_ID, USER_ROLES);
  const mongo = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  let db: Db;
  let id: string;
  const events: RawEventWithoutAuditDates[] = [];

  beforeAll(async () => {
    await mongo.connect();
    db = mongo.db(DB_NAME);
    for (let i = 0; i < 10; i++) {
      const _id = new ObjectId();
      events.push({
        _id,
        eventName: `event ${i}`,
        when: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8),
        info: `info ${i}`,
        contactInfo: `contact info ${i}`,
        state: ItemState.AWAITING_REVIEW,
        createdBy: 'fake user id',
        updatedBy: 'fake user id',
        email: `fake${i}@email.com`,
      });
    }
    await db.collection(COLLECTION_EVENTS).insertMany(events);
  });

  afterAll(async () => {
    await db
      .collection(COLLECTION_EVENTS)
      .deleteMany({ _id: { $in: [...events.map((event) => event._id)] } });
    await mongo.close();
  });

  describe('POST /events', () => {
    test('Event is created successfully', async () => {
      const time = 1000 * 60 * 60 * 24 * 8;
      const request: Events.CreateRequest = {
        eventName: 'event name',
        email: 'fake@email.com',
        when: new Date(Date.now() + time),
        info: 'info',
        contactInfo: 'contact info',
      };

      const response = await Fetch(EVENTS_ROOT, createOptions(USER_1_TOKEN, 'POST', request));
      const baseResponse: Base.CreateResponse = await response.json();
      const expected: RawEventWithoutAuditDates = {
        ...request,
        _id: new ObjectId(baseResponse.id),
        createdBy: TEST_USER_1_ID,
        updatedBy: TEST_USER_1_ID,
        state: ItemState.AWAITING_REVIEW,
      };
      const created = await db
        .collection(COLLECTION_EVENTS)
        .findOne<RawEvent>({ _id: new ObjectId(baseResponse.id) });
      expect(response.status).toBe(201);
      expect(created).toMatchObject(expected);
      id = baseResponse.id;
    });

    test('Event is rejected with date to soon (400)', async () => {
      const request: Events.CreateRequest = {
        eventName: 'event name 2',
        email: 'fake2@email.com',
        when: new Date(),
        info: 'info',
        contactInfo: 'contact info',
      };

      const response = await Fetch(EVENTS_ROOT, createOptions(USER_1_TOKEN, 'POST', request));
      expect(response.status).toBe(400);
      expect((await response.json()).message).toEqual(
        expect.stringContaining('Date must be after or equal to'),
      );
    });
  });

  describe('PATCH /events', () => {
    test('Admin can approve events', async () => {
      const request: Events.ChangeStateRequest = {
        ids: [id, new ObjectId().toHexString()],
        transition: ItemState.APPROVED,
      };
      const response = await Fetch(EVENTS_ROOT, createOptions(ADMIN_TOKEN, 'PATCH', request));

      expect(response.status).toBe(200);
      const expectedMatch: Base.MatchedCountResponse = {
        count: 2,
        matchedCount: 1,
      };

      const received = await response.json();
      expect(received).toEqual(expectedMatch);

      const updatedEvent = await db
        .collection(COLLECTION_EVENTS)
        .findOne<RawEvent>({ _id: new ObjectId(id) });
      expect(updatedEvent?.state).toBe(ItemState.APPROVED);
    });
  });

  describe('GET /events', () => {
    test('Admin can fetch events', async () => {
      const expected: EventWithoutAuditDates = {
        id: events[0]._id.toHexString(),
        email: events[0].email,
        contactInfo: events[0].contactInfo,
        createdBy: events[0].createdBy,
        updatedBy: events[0].updatedBy,
        eventName: events[0].eventName,
        info: events[0].info,
        when: events[0].when,
        state: events[0].state,
      };

      const response = await Fetch(
        `${EVENTS_ROOT}?eventName=${expected.eventName}`,
        createOptions(ADMIN_TOKEN),
      );
      expect(response.status).toBe(200);
      const results: Events.Event[] = await response.json();
      const received = results[0];
      expect({ ...received, when: new Date(received.when) }).toMatchObject(expected);
    });
  });
});
