import { Base } from './base';
import { Roles } from './roles';

export namespace Users {
  export interface LoginDetails {
    email: string;
    password: string;
  }

  export interface CreateDoc extends CreateRequest {
    roles: [Roles.Type.USER];
    isVerified: false;
    token: string;
  }

  export interface CreateRequest extends LoginDetails {
    name: string;
    isVerified?: boolean;
  }

  export interface User extends CreateRequest, Base.Record {
    isVerified: boolean;
    roles: Roles.Type[];
  }
}
