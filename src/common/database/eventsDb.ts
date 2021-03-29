import { Db, ObjectId } from 'mongodb';
import Validator from 'validatorjs';
import { Base } from '../../models/base';
import { Events } from '../../models/events';
import { COLLECTION_EVENTS, CUSTOM_VALIDATION_RULE_DATE_AFTER_OR_EQUAL } from '../config';
import { BadRequestError } from '../errors/bad-request';
import { createMatchFilter, createStateInsertWrapper, createTrimmer } from '../mongo-utils';

const SUBS_SEND_DAY = 1;

const CREATE_EVENT_VALIDATION_RULE: Validator.Rules = {
  eventName: 'required|string',
  when: `required|date|${CUSTOM_VALIDATION_RULE_DATE_AFTER_OR_EQUAL}:${getNextDate()}`,
  info: 'required|string',
  contactInfo: 'required|string',
};

// TODO does not work properly, check it for monday and tuesday
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

  public async getEvents(params: Events.Request): Promise<Events.Event[]> {
    const collection = this.db.collection(COLLECTION_EVENTS);
    const cursor = collection.aggregate<Events.Event>(this.createEventsPipeline(params), {
      allowDiskUse: true,
    });
    return await cursor.toArray();
  }

  public async createEvent(params: unknown, userId: string): Promise<Base.CreateResponse> {
    const validation = new Validator(params, CREATE_EVENT_VALIDATION_RULE);
    const isValid = validation.check();
    if (!isValid) {
      throw new BadRequestError('Failed to validate request', validation.errors.all());
    }

    const collection = this.db.collection(COLLECTION_EVENTS);
    const request = params as Events.CreateRequest;
    const result = await collection.insertOne(createStateInsertWrapper(request, userId));
    if (!result.result.ok) {
      throw new Error('Failed to insert new event');
    }
    return { id: result.insertedId };
  }

  public async changeState(params: unknown): Promise<Base.MatchedCountResponse> {
    const request = params as Events.ChangeStateRequest;
    const collection = this.db.collection(COLLECTION_EVENTS);
    const result = await collection.updateMany(
      {
        _id: { $in: request.ids.map((id) => new ObjectId(id)) },
      },
      {
        $set: { state: request.transition },
      },
    );

    if (!result.result.ok) {
      throw new Error('Failed to change state');
    }
    return { count: request.ids.length, matchedCount: result.modifiedCount };
  }

  private createEventsPipeline(options: Events.Request): Record<string, unknown>[] {
    const pipeline = [];

    pipeline.push(
      ...[
        {
          $match: createMatchFilter<Events.Request>(
            [
              { name: 'eventName', type: 'string' },
              { name: 'contactInfo', type: 'string' },
              { name: 'state', type: 'string' },
            ],
            options,
          ),
        },
        ...createTrimmer(),
      ],
    );
    return pipeline;
  }
}
