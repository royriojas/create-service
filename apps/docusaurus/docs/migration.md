---
sidebar_position: 6
title: Migration Guide
---

# Migration Guide

This guide covers migrating from older `createService` patterns to the recommended `createEndpoint` API.

## From Legacy Generic API

### Before (explicit generic)

The original API required defining an interface for the entire service and passing it as a type parameter:

```ts
interface MyService {
  getUser: (id: string) => Promise<User>;
  listUsers: () => Promise<User[]>;
  createUser: (data: CreateUserPayload) => Promise<User>;
}

const service = createService<MyService>({
  endpoints: {
    getUser: { url: (id: string) => `/v1/users/${id}` },
    listUsers: { url: '/v1/users' },
    createUser: { url: '/v1/users', method: 'POST' },
  },
  fetcher,
});
```

**Downsides:**
- Types are defined separately from the endpoint configuration
- Easy for the interface and implementation to drift apart
- Verbose for services with many endpoints

### After (createEndpoint) ✅

```ts
const service = createService({
  endpoints: {
    getUser: createEndpoint<User, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
    }),
    listUsers: createEndpoint<User[]>({
      url: '/v1/users',
    }),
    createUser: createEndpoint<User, CreateUserPayload>({
      url: '/v1/users',
      method: 'POST',
      body: (args) => args,
    }),
  },
  fetcher,
});
```

**Benefits:**
- Types are co-located with configuration
- No separate interface to maintain
- Args type flows through all descriptor functions (`url`, `body`, `headers`, `params`)

---

## From Plain Descriptors

### Before (inferred from function signatures)

The inferred API works without a generic, deriving types from function signatures:

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

**Downsides:**
- Requires explicit return type on `transform` for response type inference
- Args type is inferred from whichever function is present (`url` → `body` → `params` → `headers`), which can be confusing
- Multiple args are positional (`(id: string, name: string)`) rather than a single typed object

### After (createEndpoint) ✅

```ts
const service = createService({
  endpoints: {
    getUser: createEndpoint<User, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
    }),
  },
  fetcher,
});
```

**Benefits:**
- Response type is explicit in the generic, no need for annotated `transform`
- Single args object — cleaner, more readable, easier to extend
- All functions receive the same typed args object

---

## Migration Checklist

1. **Import `createEndpoint`**: Add it to your imports from `'service-creator'`
2. **Wrap each endpoint**: Replace plain descriptors with `createEndpoint<TResponse, TArgs>({ ... })`
3. **Convert positional args to an object**: Change `(id: string, name: string)` to `{ id: string; name: string }`
4. **Remove the explicit generic**: Change `createService<MyService>(...)` to just `createService(...)`
5. **Remove the separate interface**: The types now live in the endpoint definitions

:::tip Incremental Migration
You can mix `createEndpoint` descriptors with plain descriptors in the same service. Migrate one endpoint at a time!

```ts
const service = createService({
  endpoints: {
    // Already migrated ✅
    getUser: createEndpoint<User, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
    }),

    // Not yet migrated — still works!
    listUsers: {
      url: '/v1/users',
      transform: (data: any): User[] => data.results,
    },
  },
  fetcher,
});
```
:::
