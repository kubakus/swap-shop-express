import { createJwtToken, verifyJwtToken } from '../../common/jwt-utils';
import { Roles } from '../../models/roles';
import { describe, test, expect } from '@jest/globals';

const secretKey = 'SUPER_SECRET_KEY';
const userId = 'totally user id';
const userRoles = [Roles.Type.USER];

describe('Token tests', () => {
  test('Token is valid', () => {
    // There is problem with checking the exp and iat properties
    // because token gets created couple miliseconds
    // before potential expectedObject would be created
    // As a result, test would always fail
    const token = createJwtToken(userId, userRoles, secretKey, 60);
    const decoded = verifyJwtToken(token, secretKey);
    expect(decoded.sub).toBe(userId);
    expect(decoded.roles).toStrictEqual(userRoles);
  });

  test('Token expired', () => {
    // Expired 1min ago
    const token = createJwtToken(userId, userRoles, secretKey, -60);
    expect(() => verifyJwtToken(token, secretKey)).toThrowError('jwt expired');
  });
});
