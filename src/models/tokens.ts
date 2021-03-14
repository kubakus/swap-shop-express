import { Base } from './base';

export namespace Tokens {
  export interface RefreshToken extends Base.Record {
    userId: string;
    // token: string;
    expires: Date;
    // created: Date;
    createdByIp: string;
    revokedDate?: Date;
    revokedByIp?: string;
    replacedByTokenId?: string;
  }

  export interface TokenResponse {
    token: string;
    refreshToken: string;
  }

  export interface CreateRequest {
    userId: string;
    // kind of id
    // token: string;
    expires: Date;
    createdByIp: string;
  }

  export interface ReplaceRevokeUpdate extends RevokeUpdate {
    replacedByTokenId: string;
  }

  export interface RevokeUpdate {
    revokedDate: Date;
    revokedByIp: string;
  }
}
