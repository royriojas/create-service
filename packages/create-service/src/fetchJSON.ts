import { FetchOptions, FetchURL, SerializeBodyProps } from './fetch-types';

export interface ErrorData {
  error: string;
}
export class ResponseError extends Error {
  response?: Response;

  data?: ErrorData;
}

export async function fetchJSON<T, K>(url: FetchURL, params?: SerializeBodyProps<K>): Promise<T> {
  const { serializeBody = true, method, ...rest } = params || {};
  const fetchMethod = method ?? 'GET';

  const props: FetchOptions = {
    ...rest,
    method: fetchMethod,
    headers: {
      'Content-type': 'application/json',
      ...rest.headers,
    },
    body:
      fetchMethod === 'GET'
        ? undefined
        : ((serializeBody ? JSON.stringify(params?.body) : params?.body) as FetchOptions['body']),
  };

  try {
    const resp = await fetch(url, props);
    if (resp.status < 200 || resp.status > 300) {
      let data: ErrorData;
      try {
        data = await resp.json();
      } catch (parseError) {
        data = { error: 'JSON_ERROR_NOT_RECEIVED' };
      }
      const error = new ResponseError(data.error);
      error.response = resp;
      error.data = data;

      throw error;
    }
    const data = await resp.json();
    return data;
  } catch (err) {
    console.error('>>> err', err);
    throw err;
  }
}

export type FetchFn = typeof fetchJSON;
