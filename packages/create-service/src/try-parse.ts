export const tryParse = <T>(val: string | null, def?: T) => {
  try {
    return JSON.parse(val!) as T;
  } catch (err) {
    return def;
  }
};
