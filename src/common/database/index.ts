import { MongoClient } from 'mongodb';
import { DB_NAME, MONGO_URI } from '../config';
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
    return new Database(mongo, rolesDb, offersDb, usersDb, wantedDb);
  }

  public constructor(
    mongo: MongoClient,
    rolesDb: RolesDb,
    offersDb: OffersDb,
    usersDb: UsersDb,
    wantedDb: WantedDb,
  ) {
    this.mongo = mongo;
    this.rolesDb = rolesDb;
    this.usersDb = usersDb;
    this.offersDb = offersDb;
    this.wantedDb = wantedDb;
  }

  public async stop(): Promise<void> {
    await this.mongo.close();
  }
}
