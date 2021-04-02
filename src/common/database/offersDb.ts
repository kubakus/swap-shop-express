import { Db, ObjectId } from 'mongodb';
import Validator from 'validatorjs';
import { Base } from '../../models/base';
import { AUDIT_FILTERS } from '../../models/filters';
import { Offers } from '../../models/offers';
import { COLLECTION_OFFERS } from '../config';
import { BadRequestError } from '../errors/bad-request';
import {
  createMatchFilter,
  createStateInsertWrapper,
  createTrimmer,
  createUpdateWrapper,
} from '../mongo-utils';

const CREATE_OFFER_VALIDATION_RULE: Validator.Rules = {
  userName: 'required|string',
  info: 'required|string|max:300',
  itemName: 'required|string|max:50',
  deal: 'required|string|max:100',
  email: 'required|email',
};

export class OffersDb {
  private readonly db: Db;

  public constructor(db: Db) {
    this.db = db;
  }

  public async getOffers(params: Offers.Request): Promise<Offers.Offer[]> {
    const collection = this.db.collection(COLLECTION_OFFERS);
    const cursor = collection.aggregate<Offers.Offer>(this.createOffersPipeline(params), {
      allowDiskUse: true,
    });
    return await cursor.toArray();
  }

  public async createOffer(params: unknown, userId: string): Promise<Base.CreateResponse> {
    const validation = new Validator(params, CREATE_OFFER_VALIDATION_RULE);
    const isValid = validation.check();
    if (!isValid) {
      throw new BadRequestError('Failed to validate request', validation.errors.all());
    }

    const collection = this.db.collection(COLLECTION_OFFERS);
    const request = params as Offers.CreateRequest;

    const result = await collection.insertOne(createStateInsertWrapper(request, userId));
    if (!result.result.ok) {
      throw new Error('Failed to insert new offer');
    }
    return { id: result.insertedId };
  }

  public async changeState(params: unknown, userId: string): Promise<Base.MatchedCountResponse> {
    const request = params as Offers.ChangeStateRequest;
    const collection = this.db.collection(COLLECTION_OFFERS);
    const result = await collection.updateMany(
      {
        _id: { $in: [...request.ids.map((id) => new ObjectId(id))] },
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

  public async deleteOffered(query: Record<string, unknown>): Promise<number> {
    const collection = this.db.collection(COLLECTION_OFFERS);
    const result = await collection.deleteMany(query);
    if (!result.result.ok) {
      throw new Error('Failed to delete offered');
    }
    return result.deletedCount || 0;
  }

  // Currently only admins should be able to get offers
  // That's why there is not check for ownership,
  // the endpoint is protected by the guard
  private createOffersPipeline(options: Offers.Request): Record<string, unknown>[] {
    const pipeline: Record<string, unknown>[] = [];

    pipeline.push(
      ...[
        {
          $match: createMatchFilter<Offers.Request>(
            [
              { name: 'userName', type: 'string' },
              { name: 'email', type: 'string' },
              { name: 'itemName', type: 'string' },
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
}
