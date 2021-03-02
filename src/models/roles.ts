import { Base } from './base';

export namespace Roles {
  export const enum Type {
    ADMIN = 'admin',
    USER = 'user',
  }

  export interface Role extends Base.Record {
    role: Type;
  }

  export interface CreateRequest {
    role: Type;
  }
}
