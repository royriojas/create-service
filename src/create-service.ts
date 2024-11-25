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

export interface Fn<T extends Array<any>> {
  (...args: T): string;
}

export type ServiceFn = (...args: any[]) => Promise<any>;

export type StringOrFn<T extends ServiceFn> = string | Fn<Parameters<T>>;
export type ObjectOrFn<T extends ServiceFn> = object | Fn<Parameters<T>>;

export interface Descriptor<K extends ServiceFn> {
  url: StringOrFn<K>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE' | 'CONNECT';
  body?: ObjectOrFn<K>;
  headers?: ObjectOrFn<K>;
  params?: ObjectOrFn<K>;
  fetchOpts?: FetchOptions;
}

export type ServiceDescriptor<T> = {
  [K in keyof T]: Descriptor<T[K] extends ServiceFn ? T[K] : never>;
};

export interface CreateServiceArgs<T> {
  endpoints: ServiceDescriptor<T>;
  basePath: string | undefined;
  fetcher: Fetcher;
}

export const createService = <T>({ endpoints, basePath, fetcher }: CreateServiceArgs<T>): T =>
  Object.keys(endpoints).reduce((service, serviceName) => {
    service[serviceName] = async (...args: any[]) => {
      const { url, body, headers, method, params, fetchOpts } =
        endpoints[serviceName as keyof ServiceDescriptor<T>];

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

      return fetcher.fetch(urlToUse, opts);
    };

    return service;
  }, {} as any);
