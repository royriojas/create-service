# service-creator

A simple abstraction to create "services", plain objects that can be used to perform fetch calls in a convention over configuration fashion.

## Installation

```bash
npm install service-creator
```

## Usage

```js
import { createService } from 'service-creator';
import { v4 as uuid } from 'uuid';

const fetcher = {
  fetch: async (url, opts) => {
    const resp = await fetch(url, opts);
    return resp.json();
  },
};

// defining the interface of the service is helpful to have good typings
// service methods are async functions that return a promise that resolves to the response
// expected to be received from the fetch/xhr calls
export interface PPService {
  getSomeData: (prompt: string) => Promise<SomeData[]>;
  getDataById: (id: string) => Promise<SomeData>; 
}

const commonHeadersFn = () => {
  const appCtx = getCtx();

  return {
    'x-req-id': uuid(),
  };
};

const service = createService({
  endpoints: {
    getSomeData: {
      method: 'GET',
      url: '/v1/get-some-data',
      body: ({ prompt }) => ({ prompt }),
      headers: commonHeadersFn,
    },
    getDataById: {
      method: 'GET',
      headers: commonHeadersFn,
      url: ({ id }) => `/v1/get-some-data-by-id/${id}`, 
    },
  },
  basePath: api,  
  fetcher,
});

const data = await service.getSomeData({ prompt: 'hello world' });

console.log(data); // expected an array of SomeData

const dataById = await service.getDataById({ id: '1' });

console.log(dataById); // expected a single SomeData
```

## License

MIT
