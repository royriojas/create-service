# service-creator

[![NPM Version](https://img.shields.io/npm/v/service-creator.svg)](https://www.npmjs.com/package/service-creator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/royriojas/create-service/actions/workflows/ci.yml/badge.svg)](https://github.com/royriojas/create-service/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-v0.5.x-blue.svg)](https://royriojas.github.io/create-service/)

A type-safe, convention-over-configuration library to create HTTP services with zero boilerplate.

📖 **[Documentation Site](https://royriojas.github.io/create-service/)**

---

## The Concept

`service-creator` lets you define your API layer as a set of declarative endpoint descriptors. It automatically handles URL building, parameter injection, request bodies, and response transformation—all while providing **perfect TypeScript inference**.

## Quick Start

### 1. Define your Service

Use `createEndpoint` to define typed endpoints:

```typescript
import { createService, createEndpoint } from 'service-creator';

interface User {
  id: string;
  name: string;
}

const userService = createService({
  endpoints: {
    // 1. Simple endpoint (infer return type)
    listUsers: createEndpoint<User[]>({
      url: '/v1/users',
    }),

    // 2. Endpoint with arguments (infer arg types & return types)
    getUser: createEndpoint<User, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
    }),

    // 3. POST with typed body
    createUser: createEndpoint<User, { name: string }>({
      url: '/v1/users',
      method: 'POST',
      body: (args) => args, // args is typed as { name: string }
    }),
  },
  basePath: 'https://api.example.com',
  fetcher: {
    fetch: async (url, opts) => (await fetch(url, opts)).json()
  }
});
```

### 2. Use it (Fully Typed)

No need for generic casting at the call site. Everything is inferred from the service definition.

```typescript
// users is typed as User[]
const users = await userService.listUsers();

// params is typed as { id: string }
const user = await userService.getUser({ id: '123' });

// payload is typed as { name: string }
const newUser = await userService.createUser({ name: 'Jane' });
```

---

## Documentation

For advanced usage, including:
- 🛡️ **Custom Error Types**
- 🔄 **Response Transformation**
- 🛠️ **Custom Fetchers**
- 🔁 **Retries and Error Handling**

Visit our documentation site: **[royriojas.github.io/create-service/](https://royriojas.github.io/create-service/)**

## Packages in this Monorepo

- [`service-creator`](./packages/create-service): The core library.
- [`@service-creator/docs`](./apps/docusaurus): The documentation site source.

## License

MIT
