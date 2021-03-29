import { Filters } from './filters';

export namespace Base {
  export interface Record {
    id: string;
  }

  export interface Get {
    id?: Filters.StringFilter;
  }

  export interface AuditInfo {
    createdBy: string;
    createdDate: Date;
  }

  export interface CreateResponse {
    id: string;
  }

  export interface MatchedCountResponse {
    count: number;
    matchedCount: number;
  }
}
