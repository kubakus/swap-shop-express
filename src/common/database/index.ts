import { Db, MongoClient } from 'mongodb';
import { DB_NAME, MONGO_URI } from '../config';
import { EventsDb } from './eventsDb';
import { OffersDb } from './offersDb';
import { RefreshTokensDb } from './refreshTokensDb';
import { RolesDb } from './rolesDb';
import { SubscriptionsDb } from './subscriptionDb';
import { UsersDb } from './usersDb';
import { WantedDb } from './wantedDb';

export class Database {
  public readonly mongo: MongoClient;
  public readonly mongoDb: Db;
  public readonly rolesDb: RolesDb;
  public readonly usersDb: UsersDb;
  public readonly offersDb: OffersDb;
  public readonly wantedDb: WantedDb;
  public readonly eventsDb: EventsDb;
  public readonly refreshTokensDb: RefreshTokensDb;
  public readonly subscriptionsDb: SubscriptionsDb;

  public static async init(): Promise<Database> {
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
    const refreshTokensDb = new RefreshTokensDb(mongoDb);
    const subscriptionsDb = new SubscriptionsDb(mongoDb);
    return new Database(
      mongo,
      mongoDb,
      rolesDb,
      offersDb,
      usersDb,
      wantedDb,
      eventsDb,
      refreshTokensDb,
      subscriptionsDb,
    );
  }

  public constructor(
    mongo: MongoClient,
    mongoDb: Db,
    rolesDb: RolesDb,
    offersDb: OffersDb,
    usersDb: UsersDb,
    wantedDb: WantedDb,
    eventsDb: EventsDb,
    refreshTokensDb: RefreshTokensDb,
    subscriptionsDb: SubscriptionsDb,
  ) {
    this.mongo = mongo;
    this.mongoDb = mongoDb;
    this.rolesDb = rolesDb;
    this.usersDb = usersDb;
    this.offersDb = offersDb;
    this.wantedDb = wantedDb;
    this.eventsDb = eventsDb;
    this.refreshTokensDb = refreshTokensDb;
    this.subscriptionsDb = subscriptionsDb;
  }

  public async stop(): Promise<void> {
    await this.mongo.close();
  }
}
