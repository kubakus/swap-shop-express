import { Base } from './base';
import { Filters } from './filters';
import { ItemState } from './item-state';

export namespace Wanted {
  export interface CreateRequest {
    name: string;
    info: string;
    item: string;
    deal: string;
    email: string;
    state: ItemState;
  }

  export interface Wanted extends Base.Record, Base.AuditInfo, CreateRequest {
    state: ItemState;
  }

  export interface Request {
    name?: Filters.StringFilter;
    item?: Filters.StringFilter;
    email?: Filters.StringFilter;
    state?: Filters.StringFilter;
  }

  export interface ChangeStateRequest {
    ids: string[];
    transition: ItemState;
  }
}
