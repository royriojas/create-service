---
sidebar_position: 3
title: API Reference
---

# API Reference

## `createService(args)`

Creates a service object with typed async methods for each endpoint.

```ts
function createService<const T extends Record<string, DescriptorBase>>(args: {
  endpoints: T;
  basePath?: string;
  fetcher: Fetcher;
}): InferService<T>;
```

| Parameter | Type | Description |
|---|---|---|
| `endpoints` | `Record<string, DescriptorBase>` | Map of endpoint name → descriptor |
| `basePath` | `string` (optional) | URL prefix prepended to all endpoint URLs |
| `fetcher` | `Fetcher` | Object with a `fetch` method for making HTTP requests |

Returns an object where each key matches an endpoint name and the value is an async function with inferred types.

---

## `createEndpoint<TResponse, TArgs?, TError?>(config)`

Defines a typed endpoint descriptor. This is the **recommended** way to define endpoints.

```ts
function createEndpoint<TResponse = any, TArgs = void, TError = Error>(
  config: EndpointConfig<TResponse, TArgs>,
): TypedEndpoint<TResponse, TArgs, TError>;
```

### Generic Parameters

| Generic | Description | Default |
|---|---|---|
| `TResponse` | The return type of the service method (`Promise<TResponse>`) | `any` |
| `TArgs` | The input parameter type. Omit for no-arg endpoints. | `void` |
| `TError` | The error type (accessible via `InferError`) | `Error` |

### Config Options (`EndpointConfig`)

| Option | Type | Description |
|---|---|---|
| `url` | `string \| (args: TArgs) => string` | Endpoint URL — static or computed from args |
| `method` | `HttpMethod` | HTTP method. Default behavior determined by the fetcher. |
| `body` | `object \| (args: TArgs) => any` | Request body — static object or computed from args |
| `headers` | `object \| (args: TArgs) => any` | Request headers — static or computed from args |
| `params` | `object \| (args: TArgs) => any` | Query string parameters — static or computed from args |
| `fetchOpts` | `FetchOptions` | Additional fetch options (`credentials`, `mode`, `cache`, etc.) |
| `transform` | `(data: any) => TResponse` | Transform the raw response before returning |

---

## Types

### `HttpMethod`

```ts
type HttpMethod =
  | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT';
```

### `Fetcher`

```ts
interface Fetcher {
  fetch: FetchFn;
}
```

Where `FetchFn` matches the signature of the built-in `fetchJSON` function.

### `FetchOptions`

Standard `RequestInit` options from the Fetch API (excluding `null` and `undefined`).

### `DescriptorBase`

The base shape for any endpoint descriptor (used internally):

```ts
interface DescriptorBase {
  url: string | ((...args: any[]) => string);
  method?: HttpMethod;
  body?: object | ((...args: any[]) => any);
  headers?: object | ((...args: any[]) => any);
  params?: object | ((...args: any[]) => any);
  fetchOpts?: FetchOptions;
  transform?: (data: any) => any;
}
```

---

## Type Utilities

### `InferArgs<D>`

Extracts the arguments type from a descriptor:

```ts
type InferArgs<D> = /* ... */
```

- For `TypedEndpoint` descriptors: returns `[args: TArgs]` or `[]` if `TArgs` is `void`
- For plain descriptors: infers from `url`, `body`, `params`, or `headers` function signatures

### `InferReturn<D>`

Extracts the return type from a descriptor:

```ts
type InferReturn<D> = /* ... */
```

- For `TypedEndpoint` descriptors: returns `TResponse`
- For plain descriptors: infers from `transform` return type, or `any`

### `InferError<D>`

Extracts the error type from a branded `TypedEndpoint` descriptor:

```ts
type InferError<D> = /* ... */
```

Returns `TError` for `TypedEndpoint` descriptors, or `Error` for plain descriptors.

### `InferService<T>`

Maps a record of descriptors to the full service type:

```ts
type InferService<T extends Record<string, DescriptorBase>> = {
  [K in keyof T]: (...args: InferArgs<T[K]>) => Promise<InferReturn<T[K]>>;
};
```

---

## `ResponseError`

Error class thrown by the built-in `fetchJSON` when the response status is outside the 200–300 range:

```ts
class ResponseError extends Error {
  response?: Response;
  data?: ErrorData;
}

interface ErrorData {
  error: string;
}
```
