const SESSION_API_KEY = "image2Canvas.sessionApiKey";
const LOCAL_API_KEY = "image2Canvas.localApiKey";
const REMEMBER_KEY = "image2Canvas.rememberKey";

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type StoredKey = {
  apiKey: string;
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

export function readStoredKey(
  session: BrowserStorage = window.sessionStorage,
  local: BrowserStorage = window.localStorage,
): StoredKey {
  const remember = safeGet(local, REMEMBER_KEY) === "true";
  return {
    apiKey: remember ? safeGet(local, LOCAL_API_KEY) : safeGet(session, SESSION_API_KEY),
    remember,
  };
}

export function saveStoredKey(
  apiKey: string,
  remember: boolean,
  session: BrowserStorage = window.sessionStorage,
  local: BrowserStorage = window.localStorage,
) {
  if (remember) {
    safeSet(local, LOCAL_API_KEY, apiKey);
    safeSet(local, REMEMBER_KEY, "true");
    safeRemove(session, SESSION_API_KEY);
    return;
  }

  safeSet(session, SESSION_API_KEY, apiKey);
  safeRemove(local, LOCAL_API_KEY);
  safeRemove(local, REMEMBER_KEY);
}

export function clearStoredKey(
  session: BrowserStorage = window.sessionStorage,
  local: BrowserStorage = window.localStorage,
) {
  safeRemove(session, SESSION_API_KEY);
  safeRemove(local, LOCAL_API_KEY);
  safeRemove(local, REMEMBER_KEY);
}
