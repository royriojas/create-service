import { describe, test as it, expect } from 'bun:test';
import { setQueryParams } from '../url-helpers';

describe('url-helpers', () => {
  describe('setQueryParams', () => {
    it('should set query params', () => {
      const url = 'https://example.com/api/v1/get-some-data';
      const params = { prompt: 'hello world' };
      const expected = 'https://example.com/api/v1/get-some-data?prompt=hello+world';

      expect(setQueryParams(url, params)).toEqual(expected);
    });

    it('should set multiple query params', () => {
      const url = 'https://example.com/api/v1/get-some-data';
      const params = { prompt: 'hello world', id: '1' };
      const expected = 'https://example.com/api/v1/get-some-data?prompt=hello+world&id=1';

      expect(setQueryParams(url, params)).toEqual(expected);
    });

    it('should set multiple query params with different order', () => {
      const url = 'https://example.com/api/v1/get-some-data';
      const params = { id: '1', prompt: 'hello world' };
      const expected = 'https://example.com/api/v1/get-some-data?id=1&prompt=hello+world';

      expect(setQueryParams(url, params)).toEqual(expected);
    });

    it('should set query params with different order', () => {
      const url = 'https://example.com/api/v1/get-some-data?id=1';
      const params = { prompt: 'hello world' };
      const expected = 'https://example.com/api/v1/get-some-data?id=1&prompt=hello+world';

      expect(setQueryParams(url, params)).toEqual(expected);
    });

    it('should expand arrays into multiple query params', () => {
      const url = 'https://example.com/api/v1/get-some-data';
      const params = { prompt: 'hello world', ids: ['1', '2'] };
      const expected = 'https://example.com/api/v1/get-some-data?prompt=hello+world&ids=1&ids=2';

      expect(setQueryParams(url, params)).toEqual(expected);
    });

    it('should not add query params if they are undefined', () => {
      const url = 'https://example.com/api/v1/get-some-data';
      const params = { prompt: undefined, ids: undefined };
      const expected = 'https://example.com/api/v1/get-some-data';

      expect(setQueryParams(url, params)).toEqual(expected);
    });

    it('should arrays values to a url containing already 2 query params with the same name', () => {
      const url = 'https://example.com/api/v1/get-some-data?ids=1&ids=2';
      const params = { ids: ['3', '4'] };
      const expected = 'https://example.com/api/v1/get-some-data?ids=1&ids=2&ids=3&ids=4';

      expect(setQueryParams(url, params)).toEqual(expected);
    });
  });
});
