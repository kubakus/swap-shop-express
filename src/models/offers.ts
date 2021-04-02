import { Base } from './base';
import { Filters } from './filters';
import { ItemState } from './item-state';

export namespace Offers {
  export interface CreateRequest {
    userName: string;
    info: string;
    itemName: string;
    deal: string;
    email: string;
  }

  export interface Offer extends Base.Record, Base.AuditInfo, CreateRequest {
    state: ItemState;
  }

  export interface Request extends Base.GetWithAuditInfo {
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
