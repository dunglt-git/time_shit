export const TOKEN_STORAGE_KEY = "fis.token";

export const getStoredToken = (): string => {
  if (typeof globalThis.localStorage === "undefined") return "";
  return globalThis.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
};

export const setStoredToken = (token: string): void => {
  if (typeof globalThis.localStorage === "undefined") return;
  if (token) globalThis.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else globalThis.localStorage.removeItem(TOKEN_STORAGE_KEY);
};
