import { Db, ObjectId } from 'mongodb';
import Validator from 'validatorjs';
import { Base } from '../../models/base';
import { Wanted } from '../../models/wanted';
import { COLLECTION_WANTED } from '../config';
import { BadRequestError } from '../errors/bad-request';
import { createMatchFilter, createStateInsertWrapper, createTrimmer } from '../mongo-utils';

const CREATE_WANTED_VALIDATION_RULE: Validator.Rules = {
  name: 'required|string',
  info: 'required|string|max:300',
  item: 'required|string|max:50',
  deal: 'required|string|max:100',
  email: 'required|email',
};

export class WantedDb {
  private readonly db: Db;

  public constructor(db: Db) {
    this.db = db;
  }

  public async getWanted(params: Wanted.Request): Promise<Wanted.Wanted[]> {
    const collection = this.db.collection(COLLECTION_WANTED);
    const cursor = collection.aggregate(this.createWantedPipeline(params), { allowDiskUse: true });
    return cursor.toArray();
  }

  public async createWanted(params: unknown, userId: string): Promise<Base.CreateResponse> {
    const validation = new Validator(params, CREATE_WANTED_VALIDATION_RULE);
    const isValid = validation.check();
    if (!isValid) {
      throw new BadRequestError('Failed to validate request', validation.errors.all());
    }
    const collection = this.db.collection(COLLECTION_WANTED);
    const request = params as Wanted.CreateRequest;
    const result = await collection.insertOne(createStateInsertWrapper(request, userId));
    if (!result.result.ok) {
      throw new Error('Failed to insert new wanted');
    }
    return { id: result.insertedId };
  }

  public async changeState(params: unknown): Promise<Base.MatchedCountResponse> {
    const request = params as Wanted.ChangeStateRequest;
    const collection = this.db.collection(COLLECTION_WANTED);
    const result = await collection.updateMany(
      {
        _id: { $in: [...request.ids.map((id) => new ObjectId(id))] },
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

  // TODO add parameters
  private createWantedPipeline(options: Wanted.Request): Record<string, unknown>[] {
    const pipeline = [];

    pipeline.push(
      ...[
        {
          $match: createMatchFilter<Wanted.Request>(
            [
              { name: 'name', type: 'string' },
              { name: 'email', type: 'string' },
              { name: 'item', type: 'string' },
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
