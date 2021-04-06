import { SECRET_KEY } from '../common/config';
import { createJwtToken } from '../common/jwt-utils';
import { Roles } from '../models/roles';
import { TEST_PORT } from './server-setup';

export const TEST_API_ROOT = `http://localhost:${TEST_PORT}/api`;

export const ADMIN_ROLES = [Roles.Type.ADMIN, Roles.Type.USER];

export const USER_ROLES = [Roles.Type.USER];

export const TEST_USER_1_ID: string = process.env.TEST_USER_1_ID || 'missing user 1 id';
export const TEST_ADMIN_ID: string = process.env.TEST_ADMIN_ID || 'missing admin id';

export function createToken(id: string, roles: Roles.Type[]): string {
  return createJwtToken(id, roles, SECRET_KEY, 60 * 60);
}

type Method = 'GET' | 'POST' | 'PATCH';
export function createOptions(
  token: string,
  method: Method = 'GET',
  body?: unknown,
): Record<string, unknown> {
  return {
    method: method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
}
