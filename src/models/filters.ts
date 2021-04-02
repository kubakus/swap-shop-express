import { Base } from './base';

export const AUDIT_FILTERS: Filters.Fields<Base.GetWithAuditInfo>[] = [
  { name: 'createdDate', type: 'date' },
  { name: 'updatedDate', type: 'date' },
  { name: 'createdBy', type: 'id' },
  { name: 'updatedBy', type: 'id' },
  { name: 'id', type: 'id' },
];

export namespace Filters {
  export interface Fields<T> {
    name: keyof T;
    type: 'string' | 'id' | 'date' | 'boolean';
    matchName?: string;
  }

  export type Request<T> = {
    [P in keyof T]?: StringFilter | DateFilter | IdFilter | BooleanFilter;
  };

  export type IdFilter = string | string[];

  export type BooleanFilter = boolean;

  export type StringFilter = string | string[];

  export type DateFilter = DateFilterObject;

  interface DateFilterObject {
    after?: Date;
    before?: Date;
  }
}
