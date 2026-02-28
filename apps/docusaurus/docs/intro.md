---
slug: /
sidebar_position: 1
title: Getting Started
---

# service-creator

A simple abstraction to create **type-safe HTTP services** — plain objects with typed async methods that perform fetch calls, using convention over configuration.

## Installation

```bash
npm install service-creator
```

## Quick Start

Define your endpoints with `createEndpoint` for full type safety:

```ts
import { createService, createEndpoint } from 'service-creator';

interface User {
  id: string;
  name: string;
}

// 1. Create a fetcher (or use the built-in fetchJSON)
const fetcher = {
  fetch: async (url, opts) => {
    const resp = await fetch(url, opts);
    return resp.json();
  },
};

// 2. Define your service
const userService = createService({
  endpoints: {
    // No args — just specify the response type
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
      body: (args) => args,
    }),

    // Response transformation
    getUserName: createEndpoint<string, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
      transform: (data) => data.name,
    }),
  },
  basePath: 'https://api.example.com',
  fetcher,
});

// 3. Use it — all types are fully inferred!
const users  = await userService.listUsers();                   // User[]
const user   = await userService.getUser({ id: '123' });        // User
const created = await userService.createUser({ name: 'Ali' });  // User
const name   = await userService.getUserName({ id: '123' });    // string
```

## Why service-creator?

- **Type-safe** — `createEndpoint` gives you explicit control over request args, response types, and error types
- **Zero boilerplate** — no need to write `async/await`, `fetch`, or `JSON.parse` in every service method
- **Convention over configuration** — sensible defaults for URL resolution, body handling, and query parameters
- **Framework-agnostic** — works with any fetcher (Axios, native fetch, custom wrappers)
- **Tiny footprint** — no runtime dependencies

## Next Steps

- 📖 **[createEndpoint Guide](./create-endpoint)** — full guide to defining typed endpoints
- 📚 **[API Reference](./api-reference)** — all types and configuration options
- 🔌 **[Fetcher](./fetcher)** — built-in `fetchJSON` and custom fetcher setup
- 🧰 **[Utilities](./utilities)** — `withRetries`, URL helpers, and more
