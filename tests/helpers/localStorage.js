/**
 * Installs an in-memory localStorage on globalThis for tests that need it.
 * Call `installLocalStorage()` at the top of a test file to make sure the
 * mock is active, and `resetLocalStorage()` inside `beforeEach` to clear
 * state between tests.
 */

let store = new Map();

const fakeLocalStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
  removeItem(key) {
    store.delete(key);
  },
  clear() {
    store.clear();
  },
  get length() {
    return store.size;
  },
  key(index) {
    return [...store.keys()][index] ?? null;
  },
};

export function installLocalStorage() {
  if (globalThis.localStorage !== fakeLocalStorage) {
    globalThis.localStorage = fakeLocalStorage;
  }
}

export function resetLocalStorage() {
  store.clear();
}

export function getStore() {
  return store;
}
