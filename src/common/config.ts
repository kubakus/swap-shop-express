import { getEnvVar, getOptionalEnvNumber, getOptionalEnvVar } from './env-utils';
export const DB_NAME = 'swapshop';

// MongoDb collections' names;
export const COLLECTION_ROLES = 'roles';
export const COLLECTION_USERS = 'users';
export const COLLECTION_OFFERS = 'offers';
export const COLLECTION_WANTED = 'wanted';
export const COLLECTION_EVENTS = 'events';
export const COLLECTION_REFRESH_TOKENS = 'refresh-tokens';
export const COLLECTION_SUBSCRIPTIONS = 'subscriptions';

// Env Variables
export const MONGO_URI = getEnvVar('MONGO_URI');

export const EMAIL = getOptionalEnvVar('SWAPSHOP_EMAIL');
export const EMAIL_PASSWORD = getOptionalEnvVar('SWAPSHOP_EMAIL_PASSWORD');
export const EMAIL_SERVICE = getOptionalEnvVar('SWAPSHOP_EMAIL_SERVICE');
export const EMAIL_PORT = getOptionalEnvNumber('SWAPSHOP_EMAIL_PORT');

export const AWS_SECRET_ACCESS_KEY = getOptionalEnvVar('AWS_SECRET_ACCESS_KEY');
export const AWS_ACCESS_KEY_ID = getOptionalEnvVar('AWS_ACCESS_KEY_ID');
export const AWS_HOST = getOptionalEnvVar('AWS_HOST');
export const AWS_REGION = getOptionalEnvVar('AWS_REGION');

export const SECRET_KEY = getEnvVar('SECRET_KEY');
// 5 min in seconds
export const TOKEN_TIMEOUT = 5 * 60;
// 1 day in milisecond
export const REFRESH_TOKEN_TIMEOUT = 1 * 24 * 60 * 60 * 1000;

// Validator custom rules. Should start with CUSTOM_VALIDATION_RULE for easier usage
export const CUSTOM_VALIDATION_RULE_DATE_AFTER_OR_EQUAL = 'custom_date_after_or_equal';
