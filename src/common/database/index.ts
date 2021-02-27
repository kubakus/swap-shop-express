import { MongoClient } from "mongodb";
import { DB_NAME, MONGO_URI } from "../config";
import { RolesDb } from "./rolesDb";
import { UsersDb } from "./usersDb";

export class Database {
    public readonly mongo: MongoClient;
    public readonly rolesDb: RolesDb;
    public readonly usersDb: UsersDb;

    public static async init(): Promise<Database> {
        console.info("Connecting to mongo...");
        const mongo = new MongoClient(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        
        await mongo.connect();
        const mongoDb = mongo.db(DB_NAME);
        const rolesDb = new RolesDb(mongoDb)
        const usersDb = new UsersDb(mongoDb);
        return new Database(mongo, 
            rolesDb,
            usersDb,
            )
    }

    public constructor(
        mongo: MongoClient,
         rolesDb: RolesDb,
         usersDb: UsersDb,
         ) {
        this.mongo = mongo;
        this.rolesDb = rolesDb;
        this.usersDb = usersDb;
    }

    public async stop() {
        await this.mongo.close()
    }
}