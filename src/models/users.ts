import { Base } from './base';
import { Filters } from './filters';
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
    token: string;
  }

  export interface UserBasic extends Base.Record, Base.AuditInfo {
    name: string;
    email: string;
    roles: Roles.Type[];
    isVerified: boolean;
  }

  // TODO isVerified filter
  export interface Request extends Base.GetWithAuditInfo {
    email?: Filters.StringFilter;
    roles?: Filters.StringFilter;
    isVerified?: Filters.BooleanFilter;
  }
}
