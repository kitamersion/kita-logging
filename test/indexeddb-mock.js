// Minimal in-memory IndexedDB mock for Node.js test environment
// Only supports the methods used in kita-logging

class InMemoryIDBRequest {
  constructor(result) {
    this.result = result;
    this.onsuccess = null;
    this.onerror = null;
    this.onblocked = null;
    this.error = null;
  }
  triggerSuccess() {
    if (typeof this.onsuccess === 'function') {
      this.onsuccess({ target: this });
    }
  }
  triggerError() {
    if (typeof this.onerror === 'function') {
      this.onerror({ target: this });
    }
  }
}

class InMemoryObjectStore {
  constructor(store) {
    this.store = store;
  }
  add(value) {
    if (!value.id) value.id = Date.now() + Math.random();
    this.store.set(value.id, { ...value });
    const req = new InMemoryIDBRequest(value.id);
    setTimeout(() => req.triggerSuccess(), 0);
    return req;
  }
  put(value) {
    if (!value.key && value.id === undefined) value.key = 'current';
    this.store.set(value.key || value.id, { ...value });
    const req = new InMemoryIDBRequest(value.key || value.id);
    setTimeout(() => req.triggerSuccess(), 0);
    return req;
  }
  get(key) {
    const value = this.store.get(key) || null;
    const req = new InMemoryIDBRequest(value);
    setTimeout(() => req.triggerSuccess(), 0);
    return req;
  }
  getAll() {
    const value = Array.from(this.store.values());
    const req = new InMemoryIDBRequest(value);
    setTimeout(() => req.triggerSuccess(), 0);
    return req;
  }
  delete(key) {
    this.store.delete(key);
    const req = new InMemoryIDBRequest(undefined);
    setTimeout(() => req.triggerSuccess(), 0);
    return req;
  }
}

class InMemoryTransaction {
  constructor(stores) {
    this.stores = stores;
  }
  objectStore(name) {
    if (!this.stores[name]) throw new Error('ObjectStore not found: ' + name);
    return new InMemoryObjectStore(this.stores[name]);
  }
}

class InMemoryIDBDatabase {
  constructor(stores) {
    this.stores = stores;
  }
  transaction(storeNames, mode) {
    if (typeof storeNames === 'string') storeNames = [storeNames];
    const txStores = {};
    for (const name of storeNames) {
      if (!this.stores[name]) throw new Error('ObjectStore not found: ' + name);
      txStores[name] = this.stores[name];
    }
    return new InMemoryTransaction(txStores);
  }
  close() {}
}

class InMemoryIDBOpenDBRequest extends InMemoryIDBRequest {
  constructor(db) {
    super(db);
    this.result = db;
  }
}

const inMemoryDBs = {};

function indexedDB_open(name, version) {
  if (!inMemoryDBs[name]) {
    inMemoryDBs[name] = {
      logs: new Map(),
      config: new Map(),
    };
  }
  const db = new InMemoryIDBDatabase(inMemoryDBs[name]);
  const req = new InMemoryIDBOpenDBRequest(db);
  setTimeout(() => req.triggerSuccess(), 0);
  return req;
}

function indexedDB_deleteDatabase(name) {
  delete inMemoryDBs[name];
  const req = new InMemoryIDBRequest(undefined);
  setTimeout(() => req.triggerSuccess(), 0);
  return req;
}

// Attach to global for tests
if (typeof global !== 'undefined') {
  global.indexedDB = {
    open: indexedDB_open,
    deleteDatabase: indexedDB_deleteDatabase,
  };
}
