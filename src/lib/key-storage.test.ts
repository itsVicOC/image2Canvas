import { describe, expect, it } from "vitest";

import { clearStoredKey, readStoredKey, saveStoredKey } from "./key-storage";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe("key storage", () => {
  it("stores API keys in session storage by default", () => {
    const session = memoryStorage();
    const local = memoryStorage();
    saveStoredKey("session-key", false, session, local);
    expect(readStoredKey(session, local)).toEqual({ apiKey: "session-key", remember: false });
  });

  it("stores API keys in local storage only when remember is enabled", () => {
    const session = memoryStorage();
    const local = memoryStorage();
    saveStoredKey("local-key", true, session, local);
    expect(readStoredKey(session, local)).toEqual({ apiKey: "local-key", remember: true });
    expect(session.getItem("image2Canvas.sessionApiKey")).toBeNull();
  });

  it("clears both storage locations", () => {
    const session = memoryStorage();
    const local = memoryStorage();
    saveStoredKey("local-key", true, session, local);
    clearStoredKey(session, local);
    expect(readStoredKey(session, local)).toEqual({ apiKey: "", remember: false });
  });
});
