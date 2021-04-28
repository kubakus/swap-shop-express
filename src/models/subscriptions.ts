import { Base } from './base';
import { Filters } from './filters';

export namespace Subscriptions {
  export enum State {
    AWAITING_DISPATCH = 'AwaitingDispatch',
    DISPATCHED = 'Dispatched',
    FAILED = 'Failed',
  }
  export interface CreateRequest {
    date: Date;
    header: string;
    footer: string;
  }

  export interface CreateDoc extends CreateRequest {
    state: State.AWAITING_DISPATCH;
  }

  export interface Subscription extends CreateRequest, Base.AuditInfo, Base.Record {
    state: State;
  }

  export interface Request extends Base.GetWithAuditInfo {
    date?: Filters.DateFilter;
    state?: Filters.StringFilter;
  }
}
