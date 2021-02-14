import { MongoClient } from "mongodb";
import { getEnvVar } from "./env-utils";

export class Database {
    public readonly mongo: MongoClient;

    public static async init(): Promise<Database> {
        console.info("Connecting to mongo...");
        // TODO create a file where all required env var are stored as const
        const mongo = new MongoClient(getEnvVar("MONGO_URI"), {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })

        await mongo.connect();
        return new Database(mongo)
    }

    public constructor(mongo: MongoClient) {
        this.mongo = mongo
    }

    public async stop() {
        await this.mongo.close()
    }
}