export namespace Filters {
  export interface Fields<T> {
    name: keyof T;
    type: 'string' | 'id' | 'date';
    matchName?: string;
  }

  export type Request<T> = {
    [P in keyof T]?: StringFilter;
  };

  export type Matcher<T> = {
    [P in keyof T | string]?: unknown;
  };

  export type StringFilter = string | string[];
}
