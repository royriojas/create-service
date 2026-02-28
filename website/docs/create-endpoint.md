---
sidebar_position: 2
title: createEndpoint Guide
---

# createEndpoint

`createEndpoint` is the **recommended way** to define service endpoints. It gives you explicit, compile-time control over:

- **`TResponse`** — what the method returns
- **`TArgs`** — what the method accepts
- **`TError`** — the error type (for use with `InferError`)

```ts
import { createService, createEndpoint } from 'service-creator';
```

## Basic Usage

### No-argument endpoint

For endpoints that don't take any parameters, specify only the response type:

```ts
const service = createService({
  endpoints: {
    listUsers: createEndpoint<User[]>({
      url: '/v1/users',
    }),
  },
  fetcher,
});

// () => Promise<User[]>
const users = await service.listUsers();
```

### Endpoint with arguments

Pass the response type first, then the args type:

```ts
const service = createService({
  endpoints: {
    getUser: createEndpoint<User, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
    }),
  },
  fetcher,
});

// (args: { id: string }) => Promise<User>
const user = await service.getUser({ id: '123' });
```

The `args` parameter is passed to all descriptor functions — `url`, `body`, `headers`, and `params` — so you get type safety everywhere:

```ts
createEndpoint<User, { id: string; token: string }>({
  url: ({ id }) => `/v1/users/${id}`,
  headers: ({ token }) => ({ Authorization: `Bearer ${token}` }),
})
```

## HTTP Methods

Specify the HTTP method with the `method` option:

```ts
const service = createService({
  endpoints: {
    createUser: createEndpoint<User, { name: string; email: string }>({
      url: '/v1/users',
      method: 'POST',
      body: (args) => args,
    }),

    updateUser: createEndpoint<User, { id: string; name: string }>({
      url: ({ id }) => `/v1/users/${id}`,
      method: 'PUT',
      body: ({ name }) => ({ name }),
    }),

    deleteUser: createEndpoint<void, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
      method: 'DELETE',
    }),
  },
  fetcher,
});
```

Supported methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, `TRACE`, `CONNECT`.

## Request Body

The `body` option controls what gets sent as the request body:

```ts
// Body as a function — receives the typed args
createEndpoint<User, { name: string; age: number }>({
  url: '/v1/users',
  method: 'POST',
  body: (args) => args,  // args is typed as { name: string; age: number }
})

// Body as a static object
createEndpoint<void, void>({
  url: '/v1/ping',
  method: 'POST',
  body: { type: 'heartbeat' },
})
```

:::info Default body behavior
When no `body` function is provided, the first argument passed to the service method is used as the body for non-`GET` requests. For `GET` requests, the body is always `undefined`.
:::

## Query Parameters

Use the `params` option to add query string parameters:

```ts
const service = createService({
  endpoints: {
    searchUsers: createEndpoint<User[], { query: string; page: number }>({
      url: '/v1/users',
      params: ({ query, page }) => ({ q: query, page: String(page), limit: '20' }),
    }),
  },
  fetcher,
});

// Fetches: /v1/users?q=alice&page=1&limit=20
await service.searchUsers({ query: 'alice', page: 1 });
```

## Response Transformation

The `transform` option lets you reshape the raw API response before it's returned:

```ts
const service = createService({
  endpoints: {
    // Transform: extract just the name from the full user object
    getUserName: createEndpoint<string, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
      transform: (data) => data.name,
    }),

    // Transform: unwrap a paginated response
    listUsers: createEndpoint<User[]>({
      url: '/v1/users',
      transform: (data) => data.results,
    }),
  },
  fetcher,
});

const name = await service.getUserName({ id: '1' });  // string
const users = await service.listUsers();                // User[]
```

## Custom Headers

```ts
createEndpoint<User[], { token: string }>({
  url: '/v1/users',
  headers: ({ token }) => ({
    Authorization: `Bearer ${token}`,
    'X-Request-Id': crypto.randomUUID(),
  }),
})
```

Static headers are also supported:

```ts
createEndpoint<User[]>({
  url: '/v1/users',
  headers: { 'X-API-Version': '2' },
})
```

## Custom Error Types

The third generic parameter lets you specify the error type for use with `InferError`:

```ts
import { createService, createEndpoint, InferError } from 'service-creator';

interface ApiError {
  code: number;
  message: string;
  details?: string[];
}

const service = createService({
  endpoints: {
    riskyCall: createEndpoint<Data, { id: string }, ApiError>({
      url: ({ id }) => `/v1/data/${id}`,
    }),
  },
  fetcher,
});

// Type-level: InferError<typeof service.riskyCall> = ApiError
```

## Fetch Options

Pass additional fetch options (credentials, mode, cache, etc.) via `fetchOpts`:

```ts
createEndpoint<User[]>({
  url: '/v1/users',
  fetchOpts: {
    credentials: 'include',
    mode: 'cors',
    cache: 'no-store',
  },
})
```

## Base Path

The `basePath` option on `createService` is prepended to all endpoint URLs:

```ts
const service = createService({
  endpoints: {
    getUser: createEndpoint<User, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
    }),
  },
  basePath: 'https://api.example.com',
  fetcher,
});

// Fetches: https://api.example.com/v1/users/123
await service.getUser({ id: '123' });
```

## Complete Example

Putting it all together:

```ts
import { createService, createEndpoint } from 'service-creator';
import { fetchJSON } from 'service-creator';

interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserPayload {
  name: string;
  email: string;
}

const fetcher = { fetch: fetchJSON };

const userService = createService({
  endpoints: {
    list: createEndpoint<User[]>({
      url: '/v1/users',
    }),

    getById: createEndpoint<User, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
    }),

    create: createEndpoint<User, CreateUserPayload>({
      url: '/v1/users',
      method: 'POST',
      body: (args) => args,
    }),

    update: createEndpoint<User, { id: string; name: string }>({
      url: ({ id }) => `/v1/users/${id}`,
      method: 'PATCH',
      body: ({ name }) => ({ name }),
    }),

    delete: createEndpoint<void, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
      method: 'DELETE',
    }),

    search: createEndpoint<User[], { query: string }>({
      url: '/v1/users/search',
      params: ({ query }) => ({ q: query }),
    }),
  },
  basePath: 'https://api.example.com',
  fetcher,
});

// Every method is fully typed:
const users = await userService.list();                          // User[]
const user = await userService.getById({ id: '1' });             // User
const created = await userService.create({ name: 'A', email: 'a@b.c' }); // User
const updated = await userService.update({ id: '1', name: 'B' });         // User
await userService.delete({ id: '1' });                           // void
const results = await userService.search({ query: 'alice' });    // User[]
```
