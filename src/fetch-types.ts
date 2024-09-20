import { FetchFn } from './fetchJSON';

export type FetchJSONArgs = Parameters<typeof fetch>;
export type FetchURL = FetchJSONArgs[0];
export type FetchOptions = Exclude<FetchJSONArgs[1], null | undefined>;
export interface SerializeBodyProps<T> extends Omit<FetchOptions, 'body'> {
  body?: FetchOptions['body'] | T;
  serializeBody?: boolean;
}

export interface Fetcher {
  fetch: FetchFn;
}
