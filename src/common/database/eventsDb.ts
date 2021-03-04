import { Db } from 'mongodb';
import Validator from 'validatorjs';
import { Base } from '../../models/base';
import { Events } from '../../models/events';
import { COLLECTION_EVENTS, CUSTOM_VALIDATION_RULE_DATE_AFTER_OR_EQUAL } from '../config';
import { BadRequestError } from '../errors/bad-request';

const SUBS_SEND_DAY = 1;

const CREATE_EVENT_VALIDATION_RULE: Validator.Rules = {
  eventName: 'required|string',
  when: `required|date|${CUSTOM_VALIDATION_RULE_DATE_AFTER_OR_EQUAL}:${getNextDate()}`,
  info: 'required|string',
  contactInfo: 'required|string',
};

function getNextDate(): Date {
  const nextDate = new Date();
  nextDate.setHours(0, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + 2 + ((SUBS_SEND_DAY + 7 - nextDate.getDay() - 1) % 7));
  return nextDate;
}

export class EventsDb {
  private readonly db: Db;

  public constructor(db: Db) {
    this.db = db;
  }

  public async createEvent(params: unknown): Promise<Base.CreateResponse> {
    const validation = new Validator(params, CREATE_EVENT_VALIDATION_RULE);
    const isValid = validation.check();
    console.log('date', getNextDate());
    if (!isValid) {
      console.log('para', (params as any).when);
      throw new BadRequestError('Failed to validate request', validation.errors.all());
    }

    const collection = this.db.collection(COLLECTION_EVENTS);
    const request = params as Events.CreateRequest;
    const result = await collection.insertOne(request);
    if (!result.result.ok) {
      throw new Error('Failed to insert new event');
    }
    return { id: result.insertedId };
  }
}
