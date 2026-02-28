
[![NPM Version](https://img.shields.io/npm/v/service-creator.svg)](https://www.npmjs.com/package/service-creator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/royriojas/create-service/actions/workflows/ci.yml/badge.svg)](https://github.com/royriojas/create-service/actions/workflows/ci.yml)


# service-creator

A simple abstraction to create "services" — plain objects with typed async methods that perform fetch calls, using convention over configuration.

## Installation

```bash
npm install service-creator
```

## Usage

Define your service endpoints with `createEndpoint<TResponse, TArgs?>()` for full type safety:

```ts
import { createService, createEndpoint } from 'service-creator';

interface User {
  id: string;
  name: string;
}

const fetcher = {
  fetch: async (url, opts) => {
    const resp = await fetch(url, opts);
    return resp.json();
  },
};

const userService = createService({
  endpoints: {
    // No args — just one generic for the response type
    listUsers: createEndpoint<User[]>({
      url: '/v1/users',
    }),

    // With args — response type first, then args type
    getUser: createEndpoint<User, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
    }),

    // POST with body
    createUser: createEndpoint<User, { name: string }>({
      url: '/v1/users',
      method: 'POST',
      body: (args) => args, // args is typed as { name: string }
    }),

    // Response transformation
    getUserName: createEndpoint<string, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
      transform: (data) => data.name, // raw response → typed return value
    }),
  },
  basePath: 'https://api.example.com',
  fetcher,
});

// All types are fully inferred:
const users = await userService.listUsers();                  // User[]
const user = await userService.getUser({ id: '123' });        // User
const created = await userService.createUser({ name: 'Ali' });// User
const name = await userService.getUserName({ id: '123' });    // string
```

### `createEndpoint<TResponse, TArgs?, TError?>`

| Generic | Description | Default |
|---|---|---|
| `TResponse` | Return type (`Promise<TResponse>`) | `any` |
| `TArgs` | Input parameter type. Omit for no-arg endpoints. | `void` |
| `TError` | Error type (available via `InferError`) | `Error` |

### Descriptor options

| Option | Type | Description |
|---|---|---|
| `url` | `string \| (args: TArgs) => string` | Endpoint URL — static or dynamic |
| `method` | `HttpMethod` | HTTP method (`GET`, `POST`, `PUT`, `DELETE`, etc.) |
| `body` | `object \| (args: TArgs) => any` | Request body — static or computed from args |
| `headers` | `object \| (args: TArgs) => any` | Request headers — static or computed from args |
| `params` | `object \| (args: TArgs) => any` | Query string params — static or computed from args |
| `fetchOpts` | `FetchOptions` | Additional fetch options (credentials, mode, etc.) |
| `transform` | `(data: any) => TResponse` | Transform the raw response before returning |

### Custom error types

```ts
interface ApiError {
  code: number;
  message: string;
}

const service = createService({
  endpoints: {
    riskyCall: createEndpoint<Data, { id: string }, ApiError>({
      url: ({ id }) => `/v1/data/${id}`,
    }),
  },
  fetcher,
});
```

## Alternative styles

Plain descriptors (types inferred from function signatures):

```ts
const service = createService({
  endpoints: {
    getUser: {
      url: (id: string) => `/v1/users/${id}`,
      transform: (data: any): User => data,
    },
  },
  fetcher,
});
```

Legacy explicit interface:

```ts
interface MyService {
  getUser: (id: string) => Promise<User>;
}

const service = createService<MyService>({
  endpoints: {
    getUser: { url: (id: string) => `/v1/users/${id}` },
  },
  fetcher,
});
```

## License

MIT
