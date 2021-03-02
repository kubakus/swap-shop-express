import { Db } from 'mongodb';
import Validator from 'validatorjs';
import { Base } from '../../models/base';
import { Wanted } from '../../models/wanted';
import { COLLECTION_WANTED } from '../config';
import { BadRequestError } from '../errors/bad-request';

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

  public async createWanted(params: unknown): Promise<Base.CreateResponse> {
    const validation = new Validator(params, CREATE_WANTED_VALIDATION_RULE);
    const isValid = validation.check();
    if (!isValid) {
      throw new BadRequestError('Failed to validate request', validation.errors.all());
    }
    const collection = this.db.collection(COLLECTION_WANTED);
    const request = params as Wanted.CreateRequest;
    const result = await collection.insertOne(request);
    if (!result.result.ok) {
      throw new Error('Failed to insert new wanted');
    }
    return { id: result.insertedId };
  }
}
