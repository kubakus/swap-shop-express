import { Base } from './base';
import { Filters } from './filters';
import { ItemState } from './item-state';

export namespace Events {
  export interface CreateRequest {
    eventName: string;
    when: Date;
    info: string;
    contactInfo: string;
  }
  export interface Event extends Base.Record, Base.AuditInfo, CreateRequest {
    state: ItemState;
  }

  export interface Request extends Base.GetWithAuditInfo {
    eventName?: Filters.StringFilter;
    contactInfo?: Filters.StringFilter;
    state?: Filters.StringFilter;
  }

  export interface ChangeStateRequest {
    ids: string[];
    transition: ItemState;
  }
}
