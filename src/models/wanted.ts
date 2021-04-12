import { Base } from './base';
import { Filters } from './filters';
import { ItemState } from './item-state';

export namespace Wanted {
  export interface CreateRequest {
    userName: string;
    info: string;
    itemName: string;
    deal: string;
    email: string;
  }

  export interface Wanted extends Base.Record, Base.AuditInfo, CreateRequest {
    state: ItemState;
  }

  export interface Request {
    userName?: Filters.StringFilter;
    itemName?: Filters.StringFilter;
    email?: Filters.StringFilter;
    state?: Filters.StringFilter;
  }

  export interface ChangeStateRequest {
    ids: string[];
    transition: ItemState;
  }
}
