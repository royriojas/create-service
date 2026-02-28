export const paramsToURLSearchParams = <T extends object>(
  params: T,
  urlParams?: URLSearchParams,
) => {
  const urlSearchParams = urlParams ?? new URLSearchParams();

  const keys = Object.keys(params);
  keys.forEach((key) => {
    const val = params[key as keyof T];
    if (typeof val !== 'undefined') {
      if (Array.isArray(val)) {
        val.forEach((v) => {
          urlSearchParams.append(key, v);
        });
      } else {
        urlSearchParams.set(key, `${val}`);
      }
    }
  });

  return urlSearchParams;
};

export const setQueryParams = <T extends object>(url: string, params: T) => {
  const [baseString, searchString] = url.split(/\?/);

  const urlParams = new URLSearchParams(searchString);
  const mergeParams = paramsToURLSearchParams(params, urlParams);

  const parts = [baseString];

  const paramsToAdd = mergeParams.toString();

  if (paramsToAdd.length > 0) {
    parts.push(`?${paramsToAdd}`);
  }

  return parts.join('');
};

export const removeQueryParam = (url: string, params: string[]) => {
  const [baseString, searchString] = url.split(/\?/);

  const urlParams = new URLSearchParams(searchString);

  params.forEach((param) => {
    urlParams.delete(param);
  });

  const parts = [baseString];

  const paramsToAdd = urlParams.toString();

  if (paramsToAdd.length > 0) {
    parts.push(`?${paramsToAdd}`);
  }

  return parts.join('');
};
