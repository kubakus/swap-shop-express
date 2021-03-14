import { Roles } from '../models/roles';
import Jwt from 'jsonwebtoken';
import { SECRET_KEY, TOKEN_TIMEOUT } from './config';

export function createJwtToken(userId: string, roles: Roles.Type[]): string {
  return Jwt.sign({ roles }, SECRET_KEY, { expiresIn: TOKEN_TIMEOUT, subject: userId });
}
