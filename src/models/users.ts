import { Base } from './base';
import { Roles } from './roles';

export namespace Users {
  export interface LoginDetails {
    email: string;
    password: string;
  }

  export interface CreateDoc extends CreateRequest {
    role: Roles.Type.USER;
  }

  export interface CreateRequest extends LoginDetails {
    name: string;
  }

  export interface User extends CreateDoc, Base.Record {}

  export interface Token extends Base.Record {
    role: Roles.Type;
  }
}
