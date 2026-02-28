import { tryParse } from './try-parse';

export const getItem = <T>(key: string, defaultValue: T) => {
  const entity = localStorage.getItem(key);

  return tryParse(entity) ?? defaultValue;
};

export const setItem = <T>(key: string, entity: T) => {
  const str = JSON.stringify(entity);

  localStorage.setItem(key, str);
};

export const removeItem = (key: string) => {
  localStorage.removeItem(key);
};
