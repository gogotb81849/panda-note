import { describe, it, expect } from 'vitest';

describe('fake-indexeddb smoke test', () => {
  it('indexedDB should be defined', () => {
    expect(typeof indexedDB).toBe('object');
    expect(typeof indexedDB.open).toBe('function');
  });

  it('should open a database', async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('SmokeTest', 1);
      req.onupgradeneeded = (e) => {
        const d = (e.target as IDBOpenDBRequest).result;
        d.createObjectStore('items', { keyPath: 'id' });
      };
      req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
      req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
    });

    expect(db.name).toBe('SmokeTest');
    db.close();
  });

  it('should write and read data', async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('SmokeTest2', 1);
      req.onupgradeneeded = (e) => {
        const d = (e.target as IDBOpenDBRequest).result;
        d.createObjectStore('items', { keyPath: 'id' });
      };
      req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
      req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
    });

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      store.put({ id: '1', name: 'Test' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    const result = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction('items', 'readonly');
      const store = tx.objectStore('items');
      const req = store.get('1');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    expect(result.name).toBe('Test');
    db.close();
  });
});
