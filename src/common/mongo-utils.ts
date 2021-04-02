import { ObjectId } from 'mongodb';
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

export function createStateInsertWrapper<T>(
  params: T,
  userId: string,
): T & Base.AuditInfo & States.State {
  return {
    ...createInsertWrapper(params, userId),
    state: ItemState.AWAITING_REVIEW,
  };
}

export function createInsertWrapper<T>(params: T, userId: string): T & Base.AuditInfo {
  return {
    ...params,
    createdBy: userId,
    createdDate: new Date(),
    updatedBy: userId,
    updatedDate: new Date(),
  };
}

// TODo updatedBy created By should be a mongoid
export function createUpdateWrapper<T>(params: T, userId: string): T & Base.UpdateRequest {
  return {
    ...params,
    updatedBy: userId,
    updatedDate: new Date(),
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
): Record<string, unknown> {
  const pipeline = [];
  const fields = fieldsToMatch.filter((fieldToMatch) => options[fieldToMatch.name]);
  for (const field of fields) {
    const filter = options[field.name];
    switch (field.type) {
      case 'string':
        pipeline.push(
          createStringFilter(field.matchName || field.name, filter as Filters.StringFilter),
        );
        break;
      case 'date':
        pipeline.push(
          createDateFilter(field.matchName || field.name, filter as Filters.DateFilter),
        );
        break;
      case 'id':
        pipeline.push(createIdFilter(field.matchName || field.name, filter as Filters.IdFilter));
        break;
      case 'boolean':
        pipeline.push(
          createBooleanFilter(field.matchName || field.name, filter as Filters.BooleanFilter),
        );
        break;
      default:
        throw new BadRequestError('Not supported filter type', field.type);
    }
  }

  return createFilter(pipeline);
}

export function createStringFilter<T>(
  key: keyof T | string,
  filter: Filters.StringFilter,
): Record<string, unknown> {
  const values = Array.isArray(filter) ? filter : [filter];

  return { [key]: { $in: values } };
}

export function createBooleanFilter<T>(
  key: keyof T | string,
  filter: Filters.BooleanFilter,
): Record<string, unknown> {
  return { [key]: { $eq: filter } };
}

export function createIdFilter<T>(
  key: keyof T | string,
  filter: Filters.IdFilter,
): Record<string, unknown> {
  const values = Array.isArray(filter) ? filter : [filter];
  return { [key === 'id' ? '_id' : key]: { $in: values.map((v) => new ObjectId(v)) } };
}

export function createDateFilter<T>(
  key: keyof T | string,
  filter: Filters.DateFilter,
): Record<string, unknown> {
  const base: Record<string, unknown>[] = [];
  if (filter.before !== undefined) {
    base.push({ [key]: { $lt: filter.before } });
  }

  if (filter.after !== undefined) {
    base.push({ [key]: { $gt: filter.after } });
  }
  return createFilter(base);
}

export function createFilter(pipeline: Record<string, unknown>[]): Record<string, unknown> {
  const filtered = pipeline.filter((stage) => Object.keys(stage).length > 0);
  if (filtered.length > 1) {
    return { ['$and']: filtered };
  } else {
    return filtered[0] || {};
  }
}
