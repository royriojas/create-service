import { combinePathWithBase } from './combinePathWithBase';
import { Fetcher, FetchOptions } from './fetch-types';
import { setQueryParams } from './url-helpers';

const getDefaultData = (args: any[] = []) => (args.length > 0 ? args[0] : undefined);

const tryCall = async (fn: Function, ...args: any[]) => {
  try {
    return await fn(...args);
  } catch (err) {
    const fnName = fn ? fn.name : 'anonymous';
    console.warn(`[CreateService Error] ${fnName} failed with args:`, args);
    return undefined;
  }
};

// ─── Legacy types (kept for backward compat with createService<T>) ───

export interface Fn<T extends Array<any>> {
  (...args: T): string;
}

export type ServiceFn = (...args: any[]) => Promise<any>;

export type StringOrFn<T extends ServiceFn> = string | Fn<Parameters<T>>;
export type ObjectOrFn<T extends ServiceFn> = object | Fn<Parameters<T>>;

export interface Descriptor<K extends ServiceFn> {
  url: StringOrFn<K>;
  method?: HttpMethod;
  body?: ObjectOrFn<K>;
  headers?: ObjectOrFn<K>;
  params?: ObjectOrFn<K>;
  fetchOpts?: FetchOptions;
  transform?: (data: any) => any;
}

export type ServiceDescriptor<T> = {
  [K in keyof T]: Descriptor<T[K] extends ServiceFn ? T[K] : never>;
};

export interface CreateServiceArgs<T> {
  endpoints: ServiceDescriptor<T>;
  basePath?: string;
  fetcher: Fetcher;
}

// ─── New inferred API types ───

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'TRACE'
  | 'CONNECT';

export interface DescriptorBase {
  url: string | ((...args: any[]) => string);
  method?: HttpMethod;
  body?: object | ((...args: any[]) => any);
  headers?: object | ((...args: any[]) => any);
  params?: object | ((...args: any[]) => any);
  fetchOpts?: FetchOptions;
  transform?: (data: any) => any;
}

// ─── createEndpoint helper ───

/** @internal Type brand symbol — not present at runtime */
declare const ENDPOINT_TYPES: unique symbol;

/** A descriptor branded with explicit TResponse, TArgs, TError types */
export interface TypedEndpoint<
  TResponse = any,
  TArgs = void,
  TError = Error,
> extends DescriptorBase {
  readonly [ENDPOINT_TYPES]: { args: TArgs; response: TResponse; error: TError };
}

/** Configuration accepted by createEndpoint */
export interface EndpointConfig<TResponse, TArgs> {
  url: string | ((args: TArgs) => string);
  method?: HttpMethod;
  body?: object | ((args: TArgs) => any);
  headers?: object | ((args: TArgs) => any);
  params?: object | ((args: TArgs) => any);
  fetchOpts?: FetchOptions;
  transform?: (data: any) => TResponse;
}

/**
 * Define a typed endpoint with explicit response/input/error types.
 *
 * @example
 * ```ts
 * // No args:
 * createEndpoint<User[]>({ url: '/users' })
 * // service method: () => Promise<User[]>
 *
 * // With args:
 * createEndpoint<User, { id: string }>({
 *   url: ({ id }) => `/users/${id}`,
 * })
 * // service method: (args: { id: string }) => Promise<User>
 * ```
 */
export function createEndpoint<TResponse = any, TArgs = void, TError = Error>(
  config: EndpointConfig<TResponse, TArgs>,
): TypedEndpoint<TResponse, TArgs, TError> {
  return config as any;
}

// ─── Type inference ───

/** Infer the service method args from a descriptor */
export type InferArgs<D> =
  // 1. Branded endpoint — use the explicit TArgs
  D extends { readonly [ENDPOINT_TYPES]: { args: infer A } }
    ? [A] extends [void]
      ? []
      : [args: A]
    : // 2. Infer from descriptor functions (url → body → params → headers)
      D extends { url: (...args: infer P) => any }
      ? P
      : D extends { body: (...args: infer P) => any }
        ? P
        : D extends { params: (...args: infer P) => any }
          ? P
          : D extends { headers: (...args: infer P) => any }
            ? P
            : any[];

/** Infer the service method return type from a descriptor */
export type InferReturn<D> =
  // 1. Branded endpoint — use the explicit TResponse
  D extends { readonly [ENDPOINT_TYPES]: { response: infer R } }
    ? R
    : // 2. Infer from transform return type
      D extends { transform: (data: any) => infer R }
      ? R
      : any;

/** Infer the error type from a branded descriptor */
export type InferError<D> = D extends {
  readonly [ENDPOINT_TYPES]: { error: infer E };
}
  ? E
  : Error;

export type InferService<T extends Record<string, DescriptorBase>> = {
  [K in keyof T]: (...args: InferArgs<T[K]>) => Promise<InferReturn<T[K]>>;
};

// ─── Overloads ───

/** Create a service with types inferred from the endpoint descriptors */
export function createService<const T extends Record<string, DescriptorBase>>(args: {
  endpoints: T;
  basePath?: string;
  fetcher: Fetcher;
}): InferService<T>;

/** @deprecated Use the inferred API (call without explicit generic) */
export function createService<T>(args: CreateServiceArgs<T>): T;

// ─── Implementation ───

export function createService({ endpoints, basePath, fetcher }: any): any {
  return Object.keys(endpoints).reduce((service: any, serviceName: string) => {
    service[serviceName] = async (...args: any[]) => {
      const { url, body, headers, method, params, fetchOpts, transform } = endpoints[serviceName];

      let urlToUse: string = typeof url === 'function' ? await tryCall(url, ...args) : url;
      if (typeof urlToUse !== 'string') {
        console.error(
          '[Create Service Error]: URL must be a string or a function returning a string',
          urlToUse,
        );
        throw new Error(
          `URL must be a string or a function returning a string for method ${serviceName}.`,
        );
      }

      // TODO: detect absolute urlToUse and prevent adding the base path
      if (basePath) {
        urlToUse = combinePathWithBase(basePath, urlToUse);
      }

      const getDefault = () => (method !== 'GET' ? getDefaultData(args) : undefined);

      // if data is a function we pass all the arguments to the function so it creates
      // the payload with all the provided arguments, expecting it to return a single object
      // if the data is not a function then we get the first argument passed to the function as the
      // data payload. If this is an object it will be serialized using json stringify before sending it
      const bodyToUse = typeof body === 'function' ? await tryCall(body, ...args) : getDefault();
      const headersToUse =
        typeof headers === 'function' ? await tryCall(headers, ...args) : headers;

      const paramsToUse = typeof params === 'function' ? await tryCall(params, ...args) : params;
      const opts = { ...(fetchOpts || {}), body: bodyToUse, headers: headersToUse, method };

      if (paramsToUse) {
        urlToUse = setQueryParams(urlToUse, paramsToUse);
      }

      const result = await fetcher.fetch(urlToUse, opts);
      return transform ? transform(result) : result;
    };

    return service;
  }, {} as any);
}
