const SESSION_API_KEY = "image2Canvas.sessionApiKey";
const SESSION_BASE_URL = "image2Canvas.sessionBaseUrl";
const LOCAL_API_KEY = "image2Canvas.localApiKey";
const LOCAL_BASE_URL = "image2Canvas.localBaseUrl";
const REMEMBER_KEY = "image2Canvas.rememberKey";

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type StoredConnection = {
  apiKey: string;
  baseUrl: string;
  remember: boolean;
};

function safeGet(storage: BrowserStorage, key: string) {
  try {
    return storage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function safeSet(storage: BrowserStorage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing or locked-down WebViews.
  }
}

function safeRemove(storage: BrowserStorage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

export function readStoredConnection(
  session: BrowserStorage = window.sessionStorage,
  local: BrowserStorage = window.localStorage,
): StoredConnection {
  const remember = safeGet(local, REMEMBER_KEY) === "true";
  return {
    apiKey: remember ? safeGet(local, LOCAL_API_KEY) : safeGet(session, SESSION_API_KEY),
    baseUrl: remember ? safeGet(local, LOCAL_BASE_URL) : safeGet(session, SESSION_BASE_URL),
    remember,
  };
}

export function saveStoredConnection(
  apiKey: string,
  baseUrl: string,
  remember: boolean,
  session: BrowserStorage = window.sessionStorage,
  local: BrowserStorage = window.localStorage,
) {
  if (remember) {
    safeSet(local, LOCAL_API_KEY, apiKey);
    safeSet(local, LOCAL_BASE_URL, baseUrl);
    safeSet(local, REMEMBER_KEY, "true");
    safeRemove(session, SESSION_API_KEY);
    safeRemove(session, SESSION_BASE_URL);
    return;
  }

  safeSet(session, SESSION_API_KEY, apiKey);
  safeSet(session, SESSION_BASE_URL, baseUrl);
  safeRemove(local, LOCAL_API_KEY);
  safeRemove(local, LOCAL_BASE_URL);
  safeRemove(local, REMEMBER_KEY);
}

export function clearStoredConnection(
  session: BrowserStorage = window.sessionStorage,
  local: BrowserStorage = window.localStorage,
) {
  safeRemove(session, SESSION_API_KEY);
  safeRemove(session, SESSION_BASE_URL);
  safeRemove(local, LOCAL_API_KEY);
  safeRemove(local, LOCAL_BASE_URL);
  safeRemove(local, REMEMBER_KEY);
}
