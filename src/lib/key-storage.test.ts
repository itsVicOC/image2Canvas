import { describe, expect, it } from "vitest";

import { clearStoredConnection, readStoredConnection, saveStoredConnection } from "./key-storage";

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

describe("connection storage", () => {
  it("stores API keys and base URLs in session storage by default", () => {
    const session = memoryStorage();
    const local = memoryStorage();
    saveStoredConnection("session-key", "https://session.example/v1", false, session, local);
    expect(readStoredConnection(session, local)).toEqual({
      apiKey: "session-key",
      baseUrl: "https://session.example/v1",
      remember: false,
    });
  });

  it("stores API keys and base URLs in local storage when remember is enabled", () => {
    const session = memoryStorage();
    const local = memoryStorage();
    saveStoredConnection("local-key", "https://local.example/v1", true, session, local);
    expect(readStoredConnection(session, local)).toEqual({
      apiKey: "local-key",
      baseUrl: "https://local.example/v1",
      remember: true,
    });
    expect(session.getItem("image2Canvas.sessionApiKey")).toBeNull();
    expect(session.getItem("image2Canvas.sessionBaseUrl")).toBeNull();
  });

  it("clears both storage locations", () => {
    const session = memoryStorage();
    const local = memoryStorage();
    saveStoredConnection("local-key", "https://local.example/v1", true, session, local);
    clearStoredConnection(session, local);
    expect(readStoredConnection(session, local)).toEqual({ apiKey: "", baseUrl: "", remember: false });
  });
});
