# service-creator

A simple abstraction to create "services", plain objects that can be used to perform fetch calls in a convention over configuration fashion.

## Installation

```bash
npm install service-creator
```

## Usage

### Inferred API (recommended)

Types are inferred directly from your endpoint descriptors — no interface needed:

```ts
import { createService } from 'service-creator';

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

const service = createService({
  endpoints: {
    getUsers: {
      method: 'GET',
      url: '/v1/users',
      // transform provides return type inference: getUsers() => Promise<User[]>
      transform: (data: any): User[] => data.users,
    },
    getUserById: {
      method: 'GET',
      // url function provides parameter type inference: getUserById(id: string) => ...
      url: (id: string) => `/v1/users/${id}`,
      transform: (data: any): User => data,
    },
    createUser: {
      method: 'POST',
      url: '/v1/users',
      // body function provides parameter type inference: createUser(payload) => ...
      body: (payload: { name: string }) => payload,
      transform: (data: any): User => data,
    },
  },
  basePath: 'https://api.example.com',
  fetcher,
});

// All types are inferred:
const users = await service.getUsers();        // User[]
const user = await service.getUserById('123');  // User
const created = await service.createUser({ name: 'Alice' }); // User
```

### Legacy API

You can also pass an explicit interface for typing (backward compatible):

```ts
import { createService } from 'service-creator';
import { v4 as uuid } from 'uuid';

export interface PPService {
  getSomeData: (prompt: string) => Promise<SomeData[]>;
  getDataById: (id: string) => Promise<SomeData>;
}

const commonHeadersFn = () => ({
  'x-req-id': uuid(),
});

const service = createService<PPService>({
  endpoints: {
    getSomeData: {
      method: 'GET',
      url: '/v1/get-some-data',
      body: ({ prompt }) => ({ prompt }),
      headers: commonHeadersFn,
    },
    getDataById: {
      method: 'GET',
      headers: commonHeadersFn,
      url: ({ id }) => `/v1/get-some-data-by-id/${id}`,
    },
  },
  basePath: api,
  fetcher,
});
```

## License

MIT
