import { Db, ObjectId } from 'mongodb';
import Validator from 'validatorjs';
import { Base } from '../../models/base';
import { Events } from '../../models/events';
import { AUDIT_FILTERS } from '../../models/filters';
import { Subscriptions } from '../../models/subscriptions';
import { COLLECTION_EVENTS, COLLECTION_SUBSCRIPTIONS } from '../config';
import { BadRequestError } from '../errors/bad-request';
import {
  createMatchFilter,
  createStateInsertWrapper,
  createTrimmer,
  createUpdateWrapper,
} from '../mongo-utils';

const CREATE_EVENT_VALIDATION_RULE: Validator.Rules = {
  eventName: 'required|string',
  when: `required|date`,
  info: 'required|string',
  contactInfo: 'required|string',
};

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

  // TODO it can be a range
  public async createEvent(params: unknown, userId: string): Promise<Base.CreateResponse> {
    const validation = new Validator(params, CREATE_EVENT_VALIDATION_RULE);
    const isValid = validation.check();
    if (!isValid) {
      throw new BadRequestError('Failed to validate request', validation.errors.all());
    }

    const collection = this.db.collection(COLLECTION_EVENTS);
    const request = params as Events.CreateRequest;

    const minDate = (await this.getSubscriptionDate()) || new Date();
    const when = new Date(request.when);

    if (minDate.getTime() > when.getTime()) {
      throw new BadRequestError(
        `Event date must be after or equal to ${minDate.toISOString()}. Date sent: ${when.toISOString()}`,
      );
    }

    const result = await collection.insertOne(
      createStateInsertWrapper({ ...request, when }, userId),
    );
    if (!result.result.ok) {
      throw new Error('Failed to insert new event');
    }
    return { id: result.insertedId };
  }

  public async changeState(params: unknown, userId: string): Promise<Base.MatchedCountResponse> {
    const request = params as Events.ChangeStateRequest;
    const collection = this.db.collection(COLLECTION_EVENTS);
    const result = await collection.updateMany(
      {
        _id: { $in: request.ids.map((id) => new ObjectId(id)) },
      },
      {
        $set: createUpdateWrapper({ state: request.transition }, userId),
      },
    );

    if (!result.result.ok) {
      throw new Error('Failed to change state');
    }
    return { count: request.ids.length, matchedCount: result.modifiedCount };
  }

  public async deleteEvents(query: Record<string, unknown>): Promise<number> {
    const collection = this.db.collection(COLLECTION_EVENTS);
    const result = await collection.deleteMany(query);
    if (!result.result.ok) {
      throw new Error('Failed to delete events');
    }
    return result.deletedCount || 0;
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
              ...AUDIT_FILTERS,
            ],
            options,
          ),
        },
        ...createTrimmer(),
      ],
    );
    return pipeline;
  }

  private async getSubscriptionDate(): Promise<Date | undefined> {
    const collection = this.db.collection(COLLECTION_SUBSCRIPTIONS);
    const subscription = await collection.findOne<Subscriptions.Subscription>({
      state: 'AwaitingDispatch',
    });
    if (!subscription) {
      return undefined;
    }

    return subscription.date;
  }
}
