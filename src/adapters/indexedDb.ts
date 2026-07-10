export interface IndexedDbOperation<T = unknown> {
  kind: 'read' | 'write' | 'delete';
  mode: IDBTransactionMode;
  storeName: string;
  key: IDBValidKey;
  value?: T;
}
export function executeIndexedDbOperation<T>(db: IDBDatabase, operation: IndexedDbOperation<T>): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(operation.storeName, operation.mode);
    const store = transaction.objectStore(operation.storeName);
    const request = operation.kind === 'read'
      ? store.get(operation.key)
      : operation.kind === 'write'
        ? store.put(operation.value, operation.key)
        : store.delete(operation.key);
    request.onsuccess = () => resolve(operation.kind === 'read' ? request.result as T : undefined);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}
