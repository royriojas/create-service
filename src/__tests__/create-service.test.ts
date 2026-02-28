import { describe, test as it, expect, mock, beforeEach, spyOn } from 'bun:test';
import { createService, createEndpoint, ServiceFn } from '../create-service';
import type { Fetcher } from '../fetch-types';

// Helper to create a mock fetcher
const createMockFetcher = (response: any = { ok: true }): Fetcher => ({
  fetch: mock(() => Promise.resolve(response)) as any,
});

describe('createService', () => {
  let consoleWarnSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('basic service creation', () => {
    it('should create a service object with methods matching the endpoint keys', () => {
      const fetcher = createMockFetcher();
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users' },
        },
        basePath: undefined,
        fetcher,
      });

      expect(typeof service.getUsers).toBe('function');
    });

    it('should create a service with multiple endpoints', () => {
      const fetcher = createMockFetcher();
      const service = createService<{
        getUsers: ServiceFn;
        getUser: ServiceFn;
        createUser: ServiceFn;
      }>({
        endpoints: {
          getUsers: { url: '/users' },
          getUser: { url: (id: string) => `/users/${id}` },
          createUser: { url: '/users', method: 'POST' },
        },
        basePath: undefined,
        fetcher,
      });

      expect(typeof service.getUsers).toBe('function');
      expect(typeof service.getUser).toBe('function');
      expect(typeof service.createUser).toBe('function');
    });
  });

  describe('URL resolution', () => {
    it('should use a static string URL', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users' },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers();

      expect(fetcher.fetch).toHaveBeenCalledWith('/users', expect.objectContaining({}));
    });

    it('should call a function URL with the provided arguments', async () => {
      const fetcher = createMockFetcher();
      const urlFn = (id: string) => `/users/${id}`;
      const service = createService<{ getUser: ServiceFn }>({
        endpoints: {
          getUser: { url: urlFn },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUser('123');

      expect(fetcher.fetch).toHaveBeenCalledWith('/users/123', expect.objectContaining({}));
    });

    it('should throw an error if the URL function returns a non-string value', async () => {
      const fetcher = createMockFetcher();
      // Simulate a URL function that throws (tryCall catches it, returns undefined)
      const badUrlFn = () => {
        throw new Error('fail');
      };
      const service = createService<{ broken: ServiceFn }>({
        endpoints: {
          broken: { url: badUrlFn as any },
        },
        basePath: undefined,
        fetcher,
      });

      await expect(service.broken()).rejects.toThrow(
        'URL must be a string or a function returning a string for method broken.',
      );
    });

    it('should throw when URL is not a string (e.g. number)', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ broken: ServiceFn }>({
        endpoints: {
          broken: { url: 42 as any },
        },
        basePath: undefined,
        fetcher,
      });

      await expect(service.broken()).rejects.toThrow(
        'URL must be a string or a function returning a string',
      );
    });
  });

  describe('basePath handling', () => {
    it('should prepend basePath to the URL when provided', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users' },
        },
        basePath: 'https://api.example.com',
        fetcher,
      });

      await service.getUsers();

      expect(fetcher.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({}),
      );
    });

    it('should handle basePath with trailing slash', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users' },
        },
        basePath: 'https://api.example.com/',
        fetcher,
      });

      await service.getUsers();

      expect(fetcher.fetch).toHaveBeenCalledWith(
        'https://api.example.com/users',
        expect.objectContaining({}),
      );
    });

    it('should not modify URL when basePath is undefined', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/some/path' },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers();

      expect(fetcher.fetch).toHaveBeenCalledWith('/some/path', expect.objectContaining({}));
    });
  });

  describe('HTTP method handling', () => {
    it('should pass the method through to the fetcher', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ createUser: ServiceFn }>({
        endpoints: {
          createUser: { url: '/users', method: 'POST' },
        },
        basePath: undefined,
        fetcher,
      });

      await service.createUser({ name: 'Alice' });

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should pass undefined as method when not specified', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users' },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers();

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ method: undefined }),
      );
    });

    it('should support all standard HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

      // eslint-disable-next-line no-restricted-syntax
      for (const method of methods) {
        const fetcher = createMockFetcher();
        const service = createService<{ endpoint: ServiceFn }>({
          endpoints: {
            endpoint: { url: '/resource', method },
          },
          basePath: undefined,
          fetcher,
        });

        // eslint-disable-next-line no-await-in-loop
        await service.endpoint();

        expect(fetcher.fetch).toHaveBeenCalledWith(
          '/resource',
          expect.objectContaining({ method }),
        );
      }
    });
  });

  describe('body handling', () => {
    it('should use the first arg as body for non-GET methods when body is not a function', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ createUser: ServiceFn }>({
        endpoints: {
          createUser: { url: '/users', method: 'POST' },
        },
        basePath: undefined,
        fetcher,
      });

      const payload = { name: 'Alice' };
      await service.createUser(payload);

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ body: payload }),
      );
    });

    it('should use undefined as body for GET methods even if args are provided', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users', method: 'GET' },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers('some-arg');

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ body: undefined }),
      );
    });

    it('should use undefined as body for methods without explicit method (default undefined) when no args', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ doSomething: ServiceFn }>({
        endpoints: {
          doSomething: { url: '/action' },
        },
        basePath: undefined,
        fetcher,
      });

      await service.doSomething();

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/action',
        expect.objectContaining({ body: undefined }),
      );
    });

    it('should call body function with all args when body is a function', async () => {
      const fetcher = createMockFetcher();
      const bodyFn = mock((a: string, b: number) => ({ name: a, age: b }));

      const service = createService<{ createUser: ServiceFn }>({
        endpoints: {
          createUser: { url: '/users', method: 'POST', body: bodyFn as any },
        },
        basePath: undefined,
        fetcher,
      });

      await service.createUser('Alice', 30);

      expect(bodyFn).toHaveBeenCalledWith('Alice', 30);
      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ body: { name: 'Alice', age: 30 } }),
      );
    });

    it('should use first arg as body for non-GET when no body descriptor and args are present', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ updateUser: ServiceFn }>({
        endpoints: {
          updateUser: { url: '/users', method: 'PUT' },
        },
        basePath: undefined,
        fetcher,
      });

      const payload = { name: 'Bob' };
      await service.updateUser(payload);

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ body: payload }),
      );
    });
  });

  describe('headers handling', () => {
    it('should pass static headers to the fetcher', async () => {
      const fetcher = createMockFetcher();
      const customHeaders = { Authorization: 'Bearer token123' };
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users', headers: customHeaders },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers();

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ headers: customHeaders }),
      );
    });

    it('should call headers function with all args when headers is a function', async () => {
      const fetcher = createMockFetcher();
      const headersFn = mock((token: string) => ({ Authorization: `Bearer ${token}` }));

      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users', headers: headersFn as any },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers('myToken');

      expect(headersFn).toHaveBeenCalledWith('myToken');
      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ headers: { Authorization: 'Bearer myToken' } }),
      );
    });

    it('should pass undefined headers when not specified', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users' },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers();

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ headers: undefined }),
      );
    });
  });

  describe('params (query string) handling', () => {
    it('should append static params as query string', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users', params: { page: '1', limit: '10' } },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers();

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users?page=1&limit=10',
        expect.objectContaining({}),
      );
    });

    it('should call params function with all args when params is a function', async () => {
      const fetcher = createMockFetcher();
      const paramsFn = mock((page: number) => ({ page: `${page}`, limit: '10' }));

      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users', params: paramsFn as any },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers(2);

      expect(paramsFn).toHaveBeenCalledWith(2);
      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users?page=2&limit=10',
        expect.objectContaining({}),
      );
    });

    it('should not modify URL when params is not provided', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users' },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers();

      expect(fetcher.fetch).toHaveBeenCalledWith('/users', expect.objectContaining({}));
    });

    it('should not modify URL when params is undefined (from tryCall failure)', async () => {
      const fetcher = createMockFetcher();
      const failingParamsFn = () => {
        throw new Error('params error');
      };

      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users', params: failingParamsFn as any },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers();

      // tryCall returns undefined when function fails, so params won't be appended
      expect(fetcher.fetch).toHaveBeenCalledWith('/users', expect.objectContaining({}));
    });
  });

  describe('fetchOpts handling', () => {
    it('should merge fetchOpts into the request options', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: {
            url: '/users',
            fetchOpts: { credentials: 'include', mode: 'cors' } as any,
          },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers();

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ credentials: 'include', mode: 'cors' }),
      );
    });

    it('should override fetchOpts with computed body, headers, and method', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ createUser: ServiceFn }>({
        endpoints: {
          createUser: {
            url: '/users',
            method: 'POST',
            headers: { 'X-Custom': 'value' },
            fetchOpts: {
              // These should be overridden
              body: 'oldBody',
              headers: { 'X-Old': 'old' },
              method: 'GET',
            } as any,
          },
        },
        basePath: undefined,
        fetcher,
      });

      const payload = { name: 'Alice' };
      await service.createUser(payload);

      // body, headers, and method from the descriptor should take precedence
      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          body: payload,
          headers: { 'X-Custom': 'value' },
          method: 'POST',
        }),
      );
    });
  });

  describe('tryCall error handling', () => {
    it('should return undefined and log a warning when a body function throws', async () => {
      const fetcher = createMockFetcher();
      const failingBodyFn = () => {
        throw new Error('body error');
      };

      const service = createService<{ createUser: ServiceFn }>({
        endpoints: {
          createUser: { url: '/users', method: 'POST', body: failingBodyFn as any },
        },
        basePath: undefined,
        fetcher,
      });

      await service.createUser('arg1');

      // tryCall catches the error, body becomes undefined
      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ body: undefined }),
      );
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should return undefined and log a warning when a headers function throws', async () => {
      const fetcher = createMockFetcher();
      const failingHeadersFn = () => {
        throw new Error('headers error');
      };

      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users', headers: failingHeadersFn as any },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUsers();

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ headers: undefined }),
      );
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('fetcher.fetch return value', () => {
    it('should return the value resolved by fetcher.fetch', async () => {
      const expectedData = { users: [{ id: 1, name: 'Alice' }] };
      const fetcher = createMockFetcher(expectedData);

      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users' },
        },
        basePath: undefined,
        fetcher,
      });

      const result = await service.getUsers();

      expect(result).toEqual(expectedData);
    });

    it('should propagate errors thrown by fetcher.fetch', async () => {
      const fetcher: Fetcher = {
        fetch: mock(() => Promise.reject(new Error('network error'))) as any,
      };

      const service = createService<{ getUsers: ServiceFn }>({
        endpoints: {
          getUsers: { url: '/users' },
        },
        basePath: undefined,
        fetcher,
      });

      await expect(service.getUsers()).rejects.toThrow('network error');
    });
  });

  describe('complex scenarios', () => {
    it('should handle function URL + function body + function headers + function params + basePath', async () => {
      const fetcher = createMockFetcher({ success: true });

      const service = createService<{ complexEndpoint: ServiceFn }>({
        endpoints: {
          complexEndpoint: {
            url: (id: string) => `/items/${id}`,
            method: 'PUT',
            body: (id: string, data: any) => ({ ...data, updatedBy: `system-${id}` }),
            headers: (id: string) => ({ 'X-Item-Id': id }),
            params: (id: string) => ({ version: `${id}-v2` }),
          },
        },
        basePath: 'https://api.example.com',
        fetcher,
      });

      await service.complexEndpoint('abc', { name: 'Updated' });

      expect(fetcher.fetch).toHaveBeenCalledWith(
        'https://api.example.com/items/abc?version=abc-v2',
        expect.objectContaining({
          method: 'PUT',
          body: { name: 'Updated', updatedBy: 'system-abc' },
          headers: { 'X-Item-Id': 'abc' },
        }),
      );
    });

    it('should handle async URL functions', async () => {
      const fetcher = createMockFetcher();
      const asyncUrlFn = async (id: string) => `/users/${id}`;

      const service = createService<{ getUser: ServiceFn }>({
        endpoints: {
          getUser: { url: asyncUrlFn as any },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getUser('456');

      expect(fetcher.fetch).toHaveBeenCalledWith('/users/456', expect.objectContaining({}));
    });

    it('should handle async body functions', async () => {
      const fetcher = createMockFetcher();
      const asyncBodyFn = async (data: any) => ({ ...data, timestamp: 123 });

      const service = createService<{ create: ServiceFn }>({
        endpoints: {
          create: { url: '/items', method: 'POST', body: asyncBodyFn as any },
        },
        basePath: undefined,
        fetcher,
      });

      await service.create({ name: 'test' });

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/items',
        expect.objectContaining({
          body: { name: 'test', timestamp: 123 },
        }),
      );
    });

    it('should handle endpoint with no args and no body for non-GET', async () => {
      const fetcher = createMockFetcher();
      const service = createService<{ deleteAll: ServiceFn }>({
        endpoints: {
          deleteAll: { url: '/users', method: 'DELETE' },
        },
        basePath: undefined,
        fetcher,
      });

      await service.deleteAll();

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ body: undefined, method: 'DELETE' }),
      );
    });

    it('should pass multiple arguments to URL function', async () => {
      const fetcher = createMockFetcher();
      const urlFn = (orgId: string, userId: string) => `/orgs/${orgId}/users/${userId}`;

      const service = createService<{ getOrgUser: ServiceFn }>({
        endpoints: {
          getOrgUser: { url: urlFn },
        },
        basePath: undefined,
        fetcher,
      });

      await service.getOrgUser('org1', 'user2');

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/orgs/org1/users/user2',
        expect.objectContaining({}),
      );
    });
  });
});

describe('createService (inferred API — no explicit generic)', () => {
  const createMockFetcherInner = (response: any = { ok: true }): Fetcher => ({
    fetch: mock(() => Promise.resolve(response)) as any,
  });

  describe('basic inferred usage', () => {
    it('should create a service without an explicit generic', async () => {
      const fetcher = createMockFetcherInner({ id: 1 });
      const service = createService({
        endpoints: {
          getUsers: { url: '/users' },
        },
        fetcher,
      });

      expect(typeof service.getUsers).toBe('function');
      const result = await service.getUsers();
      expect(result).toEqual({ id: 1 });
    });

    it('should infer parameters from url function', async () => {
      const fetcher = createMockFetcherInner({ id: 1, name: 'Alice' });
      const service = createService({
        endpoints: {
          getUser: { url: (id: string) => `/users/${id}` },
        },
        fetcher,
      });

      await service.getUser('42');

      expect(fetcher.fetch).toHaveBeenCalledWith('/users/42', expect.objectContaining({}));
    });

    it('should infer parameters from body function when url is a string', async () => {
      const fetcher = createMockFetcherInner({ created: true });
      const service = createService({
        endpoints: {
          createUser: {
            url: '/users',
            method: 'POST',
            body: (data: { name: string; age: number }) => data,
          },
        },
        fetcher,
      });

      await service.createUser({ name: 'Bob', age: 25 });

      expect(fetcher.fetch).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({ body: { name: 'Bob', age: 25 } }),
      );
    });

    it('should work with multiple inferred endpoints', async () => {
      const fetcher = createMockFetcherInner({ ok: true });
      const service = createService({
        endpoints: {
          listItems: { url: '/items' },
          getItem: { url: (id: number) => `/items/${id}` },
          deleteItem: { url: (id: number) => `/items/${id}`, method: 'DELETE' },
        },
        fetcher,
      });

      expect(typeof service.listItems).toBe('function');
      expect(typeof service.getItem).toBe('function');
      expect(typeof service.deleteItem).toBe('function');
    });
  });

  describe('transform', () => {
    it('should call transform with the fetcher result', async () => {
      const rawData = { data: [{ id: 1 }, { id: 2 }], meta: { total: 2 } };
      const fetcher = createMockFetcherInner(rawData);
      const transformFn = mock((data: any) => data.data);

      const service = createService({
        endpoints: {
          getUsers: {
            url: '/users',
            transform: transformFn,
          },
        },
        fetcher,
      });

      const result = await service.getUsers();

      expect(transformFn).toHaveBeenCalledWith(rawData);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should return raw fetcher result when no transform is provided', async () => {
      const rawData = { users: ['Alice', 'Bob'] };
      const fetcher = createMockFetcherInner(rawData);

      const service = createService({
        endpoints: {
          getUsers: { url: '/users' },
        },
        fetcher,
      });

      const result = await service.getUsers();
      expect(result).toEqual(rawData);
    });

    it('should support transform with typed return value', async () => {
      interface User {
        id: number;
        name: string;
      }
      const rawData = { id: 1, name: 'Alice', extra: 'field' };
      const fetcher = createMockFetcherInner(rawData);

      const service = createService({
        endpoints: {
          getUser: {
            url: (id: string) => `/users/${id}`,
            transform: (data: any): User => ({ id: data.id, name: data.name }),
          },
        },
        fetcher,
      });

      const result = await service.getUser('1');
      expect(result).toEqual({ id: 1, name: 'Alice' });
    });

    it('should support async transform functions', async () => {
      const rawData = { value: 42 };
      const fetcher = createMockFetcherInner(rawData);

      const service = createService({
        endpoints: {
          getData: {
            url: '/data',
            transform: async (data: any) => data.value * 2,
          },
        },
        fetcher,
      });

      const result = await service.getData();
      expect(result).toBe(84);
    });

    it('should also work with transform in the legacy generic API', async () => {
      const rawData = { items: [1, 2, 3] };
      const fetcher = createMockFetcherInner(rawData);

      const service = createService<{ getItems: ServiceFn }>({
        endpoints: {
          getItems: {
            url: '/items',
            transform: (data: any) => data.items,
          },
        },
        fetcher,
      });

      const result = await service.getItems();
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('inferred complex scenarios', () => {
    it('should handle url fn + body fn + params fn + transform + basePath', async () => {
      const rawData = { id: 'abc', saved: true, extra: 'stuff' };
      const fetcher = createMockFetcherInner(rawData);

      const service = createService({
        endpoints: {
          updateItem: {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            url: (id: string, _payload: { name: string }) => `/items/${id}`,
            method: 'PUT' as const,
            body: (id: string, payload: { name: string }) => payload,
            params: () => ({ version: '2' }),
            transform: (data: any) => ({ id: data.id, saved: data.saved }),
          },
        },
        basePath: 'https://api.example.com',
        fetcher,
      });

      const result = await service.updateItem('abc', { name: 'Updated' });

      expect(fetcher.fetch).toHaveBeenCalledWith(
        'https://api.example.com/items/abc?version=2',
        expect.objectContaining({
          method: 'PUT',
          body: { name: 'Updated' },
        }),
      );
      expect(result).toEqual({ id: 'abc', saved: true });
    });

    it('should handle mixed endpoints — some with transform, some without', async () => {
      const fetcher: Fetcher = {
        fetch: mock((url: string) => {
          if (url === '/list') return Promise.resolve({ data: [1, 2] });
          return Promise.resolve({ raw: true });
        }) as any,
      };

      const service = createService({
        endpoints: {
          getList: {
            url: '/list',
            transform: (data: any) => data.data,
          },
          getRaw: {
            url: '/raw',
          },
        },
        fetcher,
      });

      const listResult = await service.getList();
      expect(listResult).toEqual([1, 2]);

      const rawResult = await service.getRaw();
      expect(rawResult).toEqual({ raw: true });
    });
  });
});

describe('createEndpoint helper', () => {
  const createMockFetcherInner = (response: any = { ok: true }): Fetcher => ({
    fetch: mock(() => Promise.resolve(response)) as any,
  });

  it('should type args and return from generics', async () => {
    interface User {
      id: string;
      name: string;
    }
    // notice that extra field is ignored because we omit it on the transform function
    const fetcher = createMockFetcherInner({ id: '1', name: 'Alice', extra: 'field' });

    const service = createService({
      endpoints: {
        getUser: createEndpoint<User, { id: string; name?: string }>({
          url: ({ id }) => `/users/${id}`,
          transform: ({ name }) => {
            return { id: '2', name: name || 'Alice' };
          },
        }),
      },
      fetcher,
    });

    const result = await service.getUser({ id: '42' });

    expect(fetcher.fetch).toHaveBeenCalledWith('/users/42', expect.objectContaining({}));
    expect(result).toEqual({ id: '2', name: 'Alice' });
  });

  it('should produce a no-arg method when TArgs is void', async () => {
    const fetcher = createMockFetcher([1, 2, 3]);

    const service = createService({
      endpoints: {
        listItems: createEndpoint<number[]>({
          url: '/items',
        }),
      },
      fetcher,
    });

    const result = await service.listItems();

    expect(fetcher.fetch).toHaveBeenCalledWith('/items', expect.objectContaining({}));
    expect(result).toEqual([1, 2, 3]);
  });

  it('should apply transform at runtime', async () => {
    const rawData = { data: { id: '1', name: 'Alice' }, meta: {} };
    const fetcher = createMockFetcher(rawData);

    const service = createService({
      endpoints: {
        getUser: createEndpoint<{ id: string; name: string }, { id: string }>({
          url: ({ id }) => `/users/${id}`,
          transform: (data: any) => data.data,
        }),
      },
      fetcher,
    });

    const result = await service.getUser({ id: '1' });
    expect(result).toEqual({ id: '1', name: 'Alice' });
  });

  it('should support custom error type (type-level only)', async () => {
    interface ApiError {
      code: number;
      message: string;
    }
    const fetcher = createMockFetcher({ ok: true });

    const service = createService({
      endpoints: {
        riskyCall: createEndpoint<{ ok: boolean }, void, ApiError>({
          url: '/risky',
        }),
      },
      fetcher,
    });

    const result = await service.riskyCall();
    expect(result).toEqual({ ok: true });
  });

  it('should work with basePath', async () => {
    const fetcher = createMockFetcher({ found: true });

    const service = createService({
      endpoints: {
        getItem: createEndpoint<{ found: boolean }, { id: number }>({
          url: ({ id }) => `/items/${id}`,
        }),
      },
      basePath: 'https://api.example.com',
      fetcher,
    });

    await service.getItem({ id: 99 });

    expect(fetcher.fetch).toHaveBeenCalledWith(
      'https://api.example.com/items/99',
      expect.objectContaining({}),
    );
  });

  it('should work alongside plain descriptors in the same service', async () => {
    const fetcher = createMockFetcher({ ok: true });

    const service = createService({
      endpoints: {
        getUser: createEndpoint<{ name: string }, { id: string }>({
          url: ({ id }) => `/users/${id}`,
        }),
        listUsers: {
          url: '/users',
          transform: (data: any): string[] => data.names,
        },
      },
      fetcher,
    });

    expect(typeof service.getUser).toBe('function');
    expect(typeof service.listUsers).toBe('function');
  });

  it('should pass args through body function', async () => {
    const fetcher = createMockFetcher({ created: true });

    const service = createService({
      endpoints: {
        createUser: createEndpoint<{ created: boolean }, { name: string; age: number }>({
          url: '/users',
          method: 'POST',
          body: (args) => args,
        }),
      },
      fetcher,
    });

    await service.createUser({ name: 'Alice', age: 30 });

    expect(fetcher.fetch).toHaveBeenCalledWith(
      '/users',
      expect.objectContaining({
        body: { name: 'Alice', age: 30 },
        method: 'POST',
      }),
    );
  });
});
