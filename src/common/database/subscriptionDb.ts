import { Db, ObjectId } from 'mongodb';
import { Base } from '../../models/base';
import { AUDIT_FILTERS } from '../../models/filters';
import { Subscriptions } from '../../models/subscriptions';
import { COLLECTION_SUBSCRIPTIONS } from '../config';
import { BadRequestError } from '../errors/bad-request';
import {
  createInsertWrapper,
  createMatchFilter,
  createTrimmer,
  createUpdateWrapper,
} from '../mongo-utils';

type RawSubscription = Omit<Subscriptions.Subscription, 'id'> & { _id: ObjectId };

export class SubscriptionsDb {
  private readonly db: Db;

  public constructor(db: Db) {
    this.db = db;
  }

  // TODO validator
  public async getSubscriptions(params: unknown): Promise<Subscriptions.Subscription[]> {
    const request = params as Subscriptions.Request;
    const collection = this.db.collection(COLLECTION_SUBSCRIPTIONS);
    const cursor = collection.aggregate<Subscriptions.Subscription>(
      this.createSubscriptionPipeline(request),
      { allowDiskUse: true },
    );
    return cursor.toArray();
  }
  // TODO maybe check if weekly? If there is subs for this week, starting monday, finishing Sunday
  // it must be at least 7 days after last subs ?
  // For now check if there is there any
  public async createSubscription(params: unknown, userId: string): Promise<Base.CreateResponse> {
    // TODO validator
    const request = params as Subscriptions.CreateRequest;

    const today = new Date();
    const date = new Date(request.date);
    if (date < today) {
      throw new BadRequestError('New subscription must happen in the future');
    }
    const collection = this.db.collection(COLLECTION_SUBSCRIPTIONS);
    const doc: Subscriptions.CreateDoc = {
      ...request,
      date,
      state: Subscriptions.State.AWAITING_DISPATCH,
    };

    // Delete any awaiting subscriptions to make sure db-api maintains only one awaiting subscription at the time;
    const subscriptionsToDelete = await collection
      .find<RawSubscription>({ state: Subscriptions.State.AWAITING_DISPATCH })
      .toArray();

    if (subscriptionsToDelete.length) {
      await collection.deleteMany({ _id: { $in: subscriptionsToDelete.map((sub) => sub._id) } });
    }

    const result = await collection.insertOne(
      createInsertWrapper<Subscriptions.CreateDoc>(doc, userId),
    );
    if (!result.result.ok) {
      throw new Error('Failed to create new subscription');
    }
    return { id: result.insertedId.toHexString() };
  }

  private createSubscriptionPipeline(options: Subscriptions.Request): Record<string, unknown>[] {
    const pipeline = [];

    pipeline.push(
      ...[
        {
          $match: createMatchFilter<Subscriptions.Request>(
            [{ name: 'state', type: 'string' }, ...AUDIT_FILTERS],
            options,
          ),
        },
        ...createTrimmer(),
      ],
    );
    return pipeline;
  }

  public async getSubscription(id: string): Promise<any> {
    const collection = this.db.collection(COLLECTION_SUBSCRIPTIONS);
    const result = await collection.findOne({ _id: new ObjectId(id) });
    if (!result) {
      throw new BadRequestError('Subscription not found');
    }
    return result;
  }

  public async updateSubscriptionState(
    id: string,
    userId: string,
    state: Subscriptions.State,
    error?: string | unknown,
  ): Promise<void> {
    const collection = this.db.collection(COLLECTION_SUBSCRIPTIONS);
    const update = { state, ...(error ? { error } : {}) };
    const result = await collection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: createUpdateWrapper(update, userId),
      },
    );

    if (!result.result.ok) {
      throw new Error('Failed to update subscription state');
    }
  }
}
