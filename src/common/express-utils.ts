import { CookieOptions } from 'express';
import { REFRESH_TOKEN_TIMEOUT } from './config';
import { BadRequestError } from './errors/bad-request';

export function getRefreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    expires: new Date(Date.now() + REFRESH_TOKEN_TIMEOUT),
  };
}

// Add check for mongo object id structure

export function checkRefreshToken(token: unknown): void {
  if (!token || typeof token !== 'string') {
    throw new BadRequestError('Refresh token missing from cookie');
  }
}
