export const combinePathWithBase = (host: string, path: string) => {
  host = host.replace(/\/$/, '');
  path = path.replace(/^\//, '');
  return `${host}/${path}`;
};
