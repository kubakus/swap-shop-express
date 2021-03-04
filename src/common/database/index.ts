import { MongoClient } from 'mongodb';
import Validator from 'validatorjs';
import { CUSTOM_VALIDATION_RULE_DATE_AFTER_OR_EQUAL, DB_NAME, MONGO_URI } from '../config';
import { BadRequestError } from '../errors/bad-request';
import { EventsDb } from './eventsDb';
import { OffersDb } from './offersDb';
import { RolesDb } from './rolesDb';
import { UsersDb } from './usersDb';
import { WantedDb } from './wantedDb';

export class Database {
  public readonly mongo: MongoClient;
  public readonly rolesDb: RolesDb;
  public readonly usersDb: UsersDb;
  public readonly offersDb: OffersDb;
  public readonly wantedDb: WantedDb;
  public readonly eventsDb: EventsDb;

  public static async init(): Promise<Database> {
    this.initValidatorRules();
    console.info('Connecting to mongo...');
    const mongo = new MongoClient(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await mongo.connect();
    const mongoDb = mongo.db(DB_NAME);
    const rolesDb = new RolesDb(mongoDb);
    const usersDb = new UsersDb(mongoDb);
    const offersDb = new OffersDb(mongoDb);
    const wantedDb = new WantedDb(mongoDb);
    const eventsDb = new EventsDb(mongoDb);
    return new Database(mongo, rolesDb, offersDb, usersDb, wantedDb, eventsDb);
  }

  public constructor(
    mongo: MongoClient,
    rolesDb: RolesDb,
    offersDb: OffersDb,
    usersDb: UsersDb,
    wantedDb: WantedDb,
    eventsDb: EventsDb,
  ) {
    this.mongo = mongo;
    this.rolesDb = rolesDb;
    this.usersDb = usersDb;
    this.offersDb = offersDb;
    this.wantedDb = wantedDb;
    this.eventsDb = eventsDb;
  }

  public async stop(): Promise<void> {
    await this.mongo.close();
  }

  /**
   * Function to initialize custom validation rules
   */
  private static initValidatorRules(): void {
    // MUST be used after 'date|' validator rules
    const dateAfterOrEqualCallback: Validator.RegisterCallback = (
      value: any,
      requirement: any,
    ): boolean => {
      const valueDate = new Date(value).getTime();
      const requirementDate = new Date(requirement).getTime();
      if (requirementDate <= valueDate) {
        return true;
      }
      throw new BadRequestError(
        `Date must be after or equal to: ${new Date(
          requirementDate,
        ).toUTCString()}, current value: ${new Date(valueDate).toUTCString()}`,
      );
    };
    Validator.register(CUSTOM_VALIDATION_RULE_DATE_AFTER_OR_EQUAL, dateAfterOrEqualCallback);
  }
}
