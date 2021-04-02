import { Filters } from './filters';

export namespace Base {
  export interface Record {
    id: string;
  }

  export interface Get {
    id?: Filters.IdFilter;
  }

  export interface UpdateRequest {
    updatedBy: string;
    updatedDate: Date;
  }

  export interface AuditInfo extends UpdateRequest {
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

  export interface GetWithAuditInfo extends Get {
    createdDate?: Filters.DateFilter;
    updatedDate?: Filters.DateFilter;
    createdBy?: Filters.IdFilter;
    updatedBy?: Filters.IdFilter;
  }
}
