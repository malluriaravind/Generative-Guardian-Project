export const hasNumbersOrLettersOnly = (str: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(str);
};

export const buildQueryParamsString = (
  params: Record<string, string | null | undefined>
): string => {
  const query = Object.entries(params)
    .filter(([_, value]) => !!value)
    .map(([key, value]) => `${key}=${value as string}`)
    .join("&");

  return query ? `?${query}` : "";
};

export const objectToString = (obj: Record<string, any>): string => {
  return `{${Object.entries(obj)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(", ")}}`;
};

export const arrayToString = (arr: any[]): string => {
  return arr.map((value) => JSON.stringify(value)).join(", ");
};
