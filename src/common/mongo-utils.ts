import { Base } from '../models/base';
import { Filters } from '../models/filters';
import { ItemState, States } from '../models/item-state';
import { BadRequestError } from './errors/bad-request';

export function getIdProjection(): Record<string, unknown> {
  return {
    id: { $convert: { input: '$_id', to: 'string' } },
    _id: 0,
  };
}
export function createInsertWrapper<T>(params: T, userId: string): T & Base.AuditInfo {
  return {
    ...params,
    createdBy: userId,
    createdDate: new Date(),
  };
}

export function createStateInsertWrapper<T>(
  params: T,
  userId: string,
): T & Base.AuditInfo & States.State {
  return {
    ...createInsertWrapper(params, userId),
    state: ItemState.AWAITING_REVIEW,
  };
}

export function createTrimmer(): Record<string, unknown>[] {
  return [
    {
      $addFields: {
        id: { $convert: { input: '$_id', to: 'string' } },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ];
}

export function createMatchFilter<T>(
  fieldsToMatch: Filters.Fields<T>[],
  options: Filters.Request<T>,
): Filters.Matcher<T> {
  const matcher: Filters.Matcher<T> = {};
  for (const field of fieldsToMatch) {
    const filter = options[field.name];
    if (filter === undefined) {
      continue;
    }

    switch (field.type) {
      case 'string':
        // unfortunately Typings do not work here and compiler still things
        // filter can be undefined here despite the check above
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        matcher[field.matchName || field.name] = createStringFilter(filter!);
        break;
      default:
        throw new BadRequestError('Not supported filter type', field.type);
    }
  }

  return matcher;
}

export function createStringFilter(filter: Filters.StringFilter): Record<string, unknown> {
  const values = Array.isArray(filter) ? filter : [filter];

  return { $in: values };
}
