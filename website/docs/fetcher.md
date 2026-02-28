---
sidebar_position: 4
title: Fetcher
---

# Fetcher

`service-creator` is **fetcher-agnostic** — you provide an object with a `fetch` method, and the library calls it for every request.

## Built-in `fetchJSON`

The package ships with `fetchJSON`, a lightweight wrapper around the native `fetch` API that:

- Sets `Content-Type: application/json`
- Serializes the request body with `JSON.stringify` (for non-`GET` requests)
- Parses the response as JSON
- Throws `ResponseError` on non-2xx status codes

```ts
import { createService, createEndpoint, fetchJSON } from 'service-creator';

const service = createService({
  endpoints: {
    getUser: createEndpoint<User, { id: string }>({
      url: ({ id }) => `/v1/users/${id}`,
    }),
  },
  fetcher: { fetch: fetchJSON },
  basePath: 'https://api.example.com',
});
```

### `fetchJSON` signature

```ts
async function fetchJSON<T, K>(
  url: FetchURL,
  params?: SerializeBodyProps<K>,
): Promise<T>;
```

### Options (`SerializeBodyProps`)

Extends standard `FetchOptions` with:

| Option | Type | Default | Description |
|---|---|---|---|
| `serializeBody` | `boolean` | `true` | Whether to `JSON.stringify` the body |
| `method` | `string` | `'GET'` | HTTP method |
| `headers` | `object` | `{ 'Content-type': 'application/json' }` | Merged with default JSON headers |

### Error Handling

When the response status is outside 200–300, `fetchJSON` throws a `ResponseError`:

```ts
import { ResponseError } from 'service-creator';

try {
  await service.getUser({ id: 'bad-id' });
} catch (err) {
  if (err instanceof ResponseError) {
    console.log(err.response?.status);  // e.g. 404
    console.log(err.data?.error);       // e.g. "User not found"
  }
}
```

## Custom Fetcher

You can provide any fetcher that matches the `Fetcher` interface:

```ts
interface Fetcher {
  fetch: (url: FetchURL, params?: FetchOptions) => Promise<any>;
}
```

### Example: Axios adapter

```ts
import axios from 'axios';

const axiosFetcher = {
  fetch: async (url: string, opts: any) => {
    const response = await axios({
      url,
      method: opts?.method || 'GET',
      data: opts?.body,
      headers: opts?.headers,
    });
    return response.data;
  },
};

const service = createService({
  endpoints: { /* ... */ },
  fetcher: axiosFetcher,
});
```

### Example: Fetch with auth token

```ts
const authFetcher = {
  fetch: async (url: string, opts: any) => {
    const token = getAuthToken(); // your auth logic
    const response = await fetch(url, {
      ...opts,
      headers: {
        ...opts?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
};
```
