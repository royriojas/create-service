---
sidebar_position: 5
title: Utilities
---

# Utilities

`service-creator` exports several utility functions that are useful alongside (or independently of) the core service functionality.

## `withRetries`

Wraps an async function with automatic retry logic.

```ts
import { withRetries } from 'service-creator';

const fetchWithRetry = withRetries(
  async (id: string) => {
    const resp = await fetch(`/api/users/${id}`);
    return resp.json();
  },
  {
    retries: 3,
    onTryError: (error, args, attemptIndex) => {
      console.warn(`Attempt ${attemptIndex + 1} failed:`, error.message);
    },
    onFail: (error, args) => {
      console.error('All retries exhausted:', error.message);
    },
  },
);

const user = await fetchWithRetry('123');
```

### Options

```ts
interface WithRetriesOpts<K> {
  retries?: number;                                              // Default: 2
  onFail?: (error: Error, args: K) => Promise<void> | void;     // Called after all retries fail
  onTryError?: (error: Error, args: K, attemptIndex: number) => Promise<void> | void; // Called on each failure
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `retries` | `number` | `2` | Total number of attempts |
| `onTryError` | `function` | — | Called after each failed attempt (can be async) |
| `onFail` | `function` | — | Called after all retries are exhausted (can be async) |

---

## URL Helpers

### `setQueryParams`

Appends or merges query parameters into a URL string:

```ts
import { setQueryParams } from 'service-creator';

setQueryParams('/users', { page: '1', limit: '10' });
// => '/users?page=1&limit=10'

setQueryParams('/users?sort=name', { page: '2' });
// => '/users?sort=name&page=2'
```

Array values are expanded into multiple query parameters:

```ts
setQueryParams('/items', { tags: ['a', 'b', 'c'] });
// => '/items?tags=a&tags=b&tags=c'
```

### `removeQueryParam`

Removes specific query parameters from a URL:

```ts
import { removeQueryParam } from 'service-creator';

removeQueryParam('/users?page=1&limit=10&sort=name', ['page', 'limit']);
// => '/users?sort=name'
```

### `combinePathWithBase`

Combines a base URL with a path, handling trailing/leading slashes:

```ts
import { combinePathWithBase } from 'service-creator';

combinePathWithBase('https://api.example.com', '/users');
// => 'https://api.example.com/users'

combinePathWithBase('https://api.example.com/', '/users');
// => 'https://api.example.com/users'
```

---

## Storage Helpers

Typed wrappers around `localStorage` with automatic JSON serialization:

### `getItem`

```ts
import { getItem } from 'service-creator';

const prefs = getItem<UserPrefs>('user-prefs', defaultPrefs);
```

### `setItem`

```ts
import { setItem } from 'service-creator';

setItem('user-prefs', { theme: 'dark', lang: 'en' });
```

### `removeItem`

```ts
import { removeItem } from 'service-creator';

removeItem('user-prefs');
```

---

## `tryParse`

Safely parse a JSON string with a fallback default value:

```ts
import { tryParse } from 'service-creator';

tryParse<number>('42');           // 42
tryParse<number>('invalid', 0);   // 0
tryParse<number>(null, 0);        // 0
```
