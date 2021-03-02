import { getEnvVar } from './env-utils';
export const DB_NAME = 'swapshop';

// MongoDb collections' names;
export const COLLECTION_ROLES = 'roles';
export const COLLECTION_USERS = 'users';
export const COLLECTION_OFFERS = 'offers';
export const COLLECTION_WANTED = 'wanted';

// Env Variables
export const MONGO_URI = getEnvVar('MONGO_URI');

export const SECRET_KEY = 'swapshop-secret-key';
export const PUBLIC_KEY = 'swapshop-public-key';
// 5min
export const TOKEN_TIMEOUT = 5 * 60 * 1000;
