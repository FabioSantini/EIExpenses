import type { IStorageAdapter } from "../data-service";

/**
 * IndexedDB Adapter for larger, more robust storage
 * Supports 250MB+ storage vs 5-10MB for localStorage
 */
export class IndexedDBAdapter implements IStorageAdapter {
  private dbName = "ei-expenses-db";
  private dbVersion = 1;
  private storeName = "keyvalue";
  private db: IDBDatabase | null = null;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (typeof window === 'undefined') {
      throw new Error('IndexedDB not available on server side');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  private async getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], mode);
    return transaction.objectStore(this.storeName);
  }

  async save<T>(key: string, data: T): Promise<void> {
    try {
      const store = await this.getStore('readwrite');

      // Store with enhanced serialization
      const serialized = JSON.stringify(data, (key, value) => {
        if (value instanceof Date) {
          return { __type: 'Date', value: value.toISOString() };
        }
        return value;
      });

      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          key,
          value: serialized,
          timestamp: Date.now()
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to save data: ${request.error?.message}`));
      });
    } catch (error) {
      throw new Error(`IndexedDB save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const store = await this.getStore('readonly');

      return new Promise<T | null>((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }

          try {
            // Enhanced deserialization
            const parsed = JSON.parse(result.value, (key, value) => {
              if (value && typeof value === 'object' && value.__type === 'Date') {
                return new Date(value.value);
              }
              return value;
            });

            resolve(parsed as T);
          } catch (parseError) {
            console.error(`Failed to parse stored data for key ${key}:`, parseError);
            resolve(null);
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to load data: ${request.error?.message}`));
        };
      });
    } catch (error) {
      console.error(`IndexedDB load failed for key ${key}:`, error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const store = await this.getStore('readwrite');

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to remove data: ${request.error?.message}`));
      });
    } catch (error) {
      throw new Error(`IndexedDB remove failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clear(): Promise<void> {
    try {
      const store = await this.getStore('readwrite');

      await new Promise<void>((resolve, reject) => {
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear data: ${request.error?.message}`));
      });
    } catch (error) {
      throw new Error(`IndexedDB clear failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const store = await this.getStore('readonly');

      return new Promise<string[]>((resolve, reject) => {
        const keys: string[] = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const key = cursor.key as string;
            if (!prefix || key.startsWith(prefix)) {
              keys.push(key);
            }
            cursor.continue();
          } else {
            resolve(keys);
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to list keys: ${request.error?.message}`));
        };
      });
    } catch (error) {
      console.error('IndexedDB list failed:', error);
      return [];
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{ used: number; available: number }> {
    try {
      if (typeof window === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
        return { used: 0, available: 250 * 1024 * 1024 }; // Default 250MB estimate
      }

      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 250 * 1024 * 1024; // Default to 250MB

      return {
        used,
        available: Math.max(0, quota - used)
      };
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
      return { used: 0, available: 250 * 1024 * 1024 };
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}