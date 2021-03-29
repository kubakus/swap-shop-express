import { Roles } from '../models/roles';
import Jwt from 'jsonwebtoken';

export interface TokenPayload {
  iat: number;
  sub: string;
  roles: Roles.Type[];
  exp: number;
}

export function createJwtToken(
  userId: string,
  roles: Roles.Type[],
  secretKey: Jwt.Secret,
  expiresInSeconds: number,
): string {
  return Jwt.sign({ roles }, secretKey, { expiresIn: expiresInSeconds, subject: userId });
}

// TODO add check for algorithm
export function verifyJwtToken(token: string, secretKey: Jwt.Secret): TokenPayload {
  const decoded = Jwt.verify(token, secretKey);
  if (typeof decoded !== 'object') {
    throw new Error('Failed to decode token');
  }
  return decoded as TokenPayload;
}
