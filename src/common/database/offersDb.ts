import { Db } from 'mongodb';
import Validator from 'validatorjs';
import { Base } from '../../models/base';
import { Offers } from '../../models/offers';
import { COLLECTION_OFFERS } from '../config';
import { BadRequestError } from '../errors/bad-request';

const CREATE_OFFER_VALIDATION_RULE: Validator.Rules = {
  name: 'required|string',
  info: 'required|string|max:300',
  item: 'required|string|max:50',
  deal: 'required|string|max:100',
  email: 'required|email',
};

export class OffersDb {
  private readonly db: Db;

  public constructor(db: Db) {
    this.db = db;
  }

  public async createOffer(params: unknown): Promise<Base.CreateResponse> {
    const validation = new Validator(params, CREATE_OFFER_VALIDATION_RULE);
    const isValid = validation.check();
    if (!isValid) {
      throw new BadRequestError('Failed to validate request', validation.errors.all());
    }

    const collection = this.db.collection(COLLECTION_OFFERS);
    const request = params as Offers.CreateRequest;
    const result = await collection.insertOne(request);
    if (!result.result.ok) {
      throw new Error('Failed to insert new offer');
    }
    return { id: result.insertedId };
  }
}
