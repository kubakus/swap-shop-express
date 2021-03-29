import { createMatchFilter } from '../../common/mongo-utils';
import { Offers } from '../../models/offers';
import { describe, test, expect } from '@jest/globals';

describe('Mongo utils test', () => {
  describe('Create match filter', () => {
    test('Filter is correctly created', () => {
      const request: Offers.Request = {
        state: ['AwaitingReview'],
        name: ['Phone', 'case'],
      };

      const expectedResult = {
        state: { $in: request.state },
        name: { $in: request.name },
      };

      const filter = createMatchFilter<Offers.Request>(
        [
          { name: 'state', type: 'string' },
          { name: 'name', type: 'string' },
        ],
        request,
      );

      expect(filter).toStrictEqual(expectedResult);
    });

    test('Filters are created only for desired values', () => {
      const request: Offers.Request = {
        state: ['AwaitingReview'],
        name: ['Phone', 'case'],
      };

      const expectedResult = {
        state: { $in: request.state },
      };

      const filter = createMatchFilter<Offers.Request>(
        [{ name: 'state', type: 'string' }],
        request,
      );
      expect(filter).toStrictEqual(expectedResult);
    });

    test('Throws errors for not implemented filters', () => {
      const request: Offers.Request = {
        state: ['AwaitingReview'],
      };

      expect(() =>
        createMatchFilter<Offers.Request>([{ name: 'state', type: 'id' }], request),
      ).toThrowError('Not supported filter type');
    });
  });
});
