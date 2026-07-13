export interface IndexedDbOperation<T = unknown> {
  kind: 'read' | 'write' | 'delete';
  mode: IDBTransactionMode;
  storeName: string;
  key: IDBValidKey;
  value?: T;
}

export function openIndexedDbDatabase(
  factory: IDBFactory | null | undefined,
  name: string,
  version: number,
  storeNames: readonly string[],
): Promise<IDBDatabase> {
  if(!factory) return Promise.reject(new Error('IndexedDB not supported'));
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(name, version);
    } catch(error) {
      reject(error);
      return;
    }
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    request.onupgradeneeded = () => {
      for(const storeName of storeNames) {
        if(!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export function executeIndexedDbOperation<T>(db: IDBDatabase, operation: IndexedDbOperation<T>): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;
    let request: IDBRequest;
    let readResult: T | undefined;
    let settled = false;

    const fail = (error: unknown): void => {
      if(settled) return;
      settled = true;
      reject(error || new Error('IndexedDB transaction failed'));
    };

    try {
      transaction = db.transaction(operation.storeName, operation.mode);
      const store = transaction.objectStore(operation.storeName);
      request = operation.kind === 'read'
        ? store.get(operation.key)
        : operation.kind === 'write'
          ? store.put(operation.value, operation.key)
          : store.delete(operation.key);
    } catch(error) {
      fail(error);
      return;
    }

    request.onsuccess = () => {
      if(operation.kind === 'read') readResult = request.result as T | undefined;
    };
    request.onerror = () => fail(request.error);
    transaction.onerror = () => fail(transaction.error || request.error);
    transaction.onabort = () => fail(transaction.error || new Error('IndexedDB transaction aborted'));
    transaction.oncomplete = () => {
      if(settled) return;
      settled = true;
      resolve(operation.kind === 'read' ? readResult : undefined);
    };
  });
}
