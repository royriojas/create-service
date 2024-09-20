export interface WithRetriesOpts<K> {
  retries?: number;
  onFail?: (error: Error, args: K) => Promise<void> | void;
  onTryError?: (error: Error, args: K, attemptIndex: number) => Promise<void> | void;
}

export const withRetries = <K extends any[], T>(
  fn: (...args: K) => Promise<T>,
  { retries = 2, onTryError, onFail }: WithRetriesOpts<K> = {},
) => {
  const retFn = async (...args: K) => {
    let attemptIndex = 0;

    while (attemptIndex < retries) {
      try {
        const ret = await fn(...args); // eslint-disable-line no-await-in-loop

        return ret as T;
      } catch (err) {
        if (attemptIndex < retries) {
          try {
            await onTryError?.(err as Error, args, attemptIndex); // eslint-disable-line no-await-in-loop
          } catch (error) {
            await onFail?.(error as Error, args); // eslint-disable-line no-await-in-loop
            throw error;
          }
        }
        attemptIndex += 1;
        if (attemptIndex >= retries) {
          await onFail?.(err as Error, args); // eslint-disable-line no-await-in-loop
          throw err;
        }
      }
    }
  };

  return retFn as (...args: K) => Promise<T>;
};
