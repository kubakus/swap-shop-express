import { getEnvVar } from './env-utils';
export const DB_NAME = 'swapshop';

// MongoDb collections' names;
export const COLLECTION_ROLES = 'roles';
export const COLLECTION_USERS = 'users';
export const COLLECTION_OFFERS = 'offers';
export const COLLECTION_WANTED = 'wanted';
export const COLLECTION_EVENTS = 'events';
export const COLLECTION_REFRESH_TOKENS = 'refresh-tokens';

// Env Variables
export const MONGO_URI = getEnvVar('MONGO_URI');
export const UI_URL = getEnvVar('UI_URL');
// export const DB_API_URL = getEnvVar('DB_API_URL');

export const EMAIL = getEnvVar('SWAPSHOP_EMAIL');
export const EMAIL_PASSWORD = getEnvVar('SWAPSHOP_EMAIL_PASSWORD');

// TODO these should be stored in files and paths to those files should be
// stored as env vars.
export const SECRET_KEY_EMAIL_CONFIRMATION = 'confirm-email-secret';
export const PUBLIC_KEY_EMAIL_CONFIRMATION = 'confirm-email-public';
export const SECRET_KEY = 'swapshop-secret-key';
export const PUBLIC_KEY = 'swapshop-public-key';
// 5min
export const TOKEN_TIMEOUT = '5m';
// 1 day in milisecond
export const REFRESH_TOKEN_TIMEOUT = 1 * 24 * 60 * 60 * 1000;

// Validator custom rules. Should start with CUSTOM_VALIDATION_RULE for easier usage
export const CUSTOM_VALIDATION_RULE_DATE_AFTER_OR_EQUAL = 'custom_date_after_or_equal';
