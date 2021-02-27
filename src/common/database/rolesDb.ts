import { Db} from 'mongodb'
import { Base } from '../../models/base';
import { COLLECTION_ROLES } from '../config';

export class RolesDb {
    private readonly db: Db;

    public constructor(db: Db) {
        this.db = db;
    }

    public async createRole(request: unknown): Promise<Base.CreateResponse> {
        const collection = this.db.collection(COLLECTION_ROLES);
        const result = await collection.insertOne(request);
        if (!result.result.ok) {
            throw new Error("Failed to insert new role")
        }
        return result.insertedId
    }
}