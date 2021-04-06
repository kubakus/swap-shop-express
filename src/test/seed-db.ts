import { Db, MongoClient, ObjectId } from 'mongodb';
import { COLLECTION_USERS, DB_NAME, MONGO_URI } from '../common/config';
import Bcryptjs from 'bcryptjs';
import { Roles } from '../models/roles';

export const USER_1_PASSWORD = 'aaaaaaaa';
export const USER_1_EMAIL = 'user1@fake.com';

export const ADMIN_PASSWORD = 'AAAAAAAA';
export const ADMIN_EMAIL = 'admin@fake.com';

export async function seedDb(): Promise<void> {
  const mongo = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await mongo.connect();
  const db = mongo.db(DB_NAME);
  await createUsersDb(db);
  await mongo.close();
}

async function createUsersDb(db: Db): Promise<void> {
  await db.createCollection(COLLECTION_USERS);
  const salt = await Bcryptjs.genSalt(10);
  const user1Id = new ObjectId();
  const adminId = new ObjectId();

  // Jest does not support sharing state between tests
  // https://github.com/kulshekhar/ts-jest/issues/411#issuecomment-605515177
  // In order to avoid initialising db for each test case or fetching admin
  // and user info every time, pass it as env variable
  process.env.TEST_ADMIN_ID = adminId.toHexString();
  process.env.TEST_USER_1_ID = user1Id.toHexString();

  const user1 = {
    _id: user1Id,
    name: 'user1',
    email: USER_1_EMAIL,
    password: await Bcryptjs.hash(USER_1_PASSWORD, salt),
    roles: [Roles.Type.USER],
    isVerified: true,
  };

  const admin = {
    _id: adminId,
    name: 'admin',
    email: ADMIN_EMAIL,
    password: await Bcryptjs.hash(ADMIN_PASSWORD, salt),
    roles: [Roles.Type.USER, Roles.Type.ADMIN],
    isVerified: true,
  };
  await db.collection(COLLECTION_USERS).insertMany([user1, admin]);
}
