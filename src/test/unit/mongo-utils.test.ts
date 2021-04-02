import { createMatchFilter } from '../../common/mongo-utils';
import { Offers } from '../../models/offers';
import { describe, test, expect } from '@jest/globals';

describe('Mongo utils test', () => {
  describe('Create match filter', () => {
    test('Filter without value', () => {
      const request: Offers.Request = {};
      const expectedResult = {};

      const result = createMatchFilter<Offers.Request>(
        [
          { name: 'userName', type: 'string' },
          { name: 'email', type: 'string' },
        ],
        request,
      );

      expect(result).toStrictEqual(expectedResult);
    });

    test('Filter is correctly created', () => {
      const request: Offers.Request = {
        state: ['AwaitingReview'],
        itemName: ['Phone', 'case'],
        createdDate: { after: new Date(), before: new Date() },
      };

      const expectedResult = {
        $and: [
          { state: { $in: request.state } },
          { itemName: { $in: request.itemName } },
          {
            $and: [
              { createdDate: { $lt: request.createdDate?.after } },
              { createdDate: { $gt: request.createdDate?.before } },
            ],
          },
        ],
      };

      const filter = createMatchFilter<Offers.Request>(
        [
          { name: 'state', type: 'string' },
          { name: 'itemName', type: 'string' },
          { name: 'createdDate', type: 'date' },
        ],
        request,
      );

      expect(filter).toStrictEqual(expectedResult);
    });

    test('Filters are created only for desired values', () => {
      const request: Offers.Request = {
        state: ['AwaitingReview'],
        userName: ['Phone', 'case'],
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
  });
});
