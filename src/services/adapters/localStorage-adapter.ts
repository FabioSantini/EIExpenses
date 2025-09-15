import type { IStorageAdapter } from "../data-service";

/**
 * Enhanced LocalStorage Adapter with proper Date handling
 * Handles serialization/deserialization correctly
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private keyPrefix = "ei-expenses:";

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async save<T>(key: string, data: T): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('LocalStorage not available on server side');
    }

    try {
      // Enhanced serialization that handles Date objects correctly
      const serialized = JSON.stringify(data, (key, value) => {
        if (value instanceof Date) {
          return { __type: 'Date', value: value.toISOString() };
        }
        return value;
      });

      localStorage.setItem(this.getKey(key), serialized);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please clear some data or use IndexedDB storage.');
      }
      throw new Error(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async load<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(this.getKey(key));
      if (!stored) {
        return null;
      }

      // Enhanced deserialization that restores Date objects
      const parsed = JSON.parse(stored, (key, value) => {
        if (value && typeof value === 'object' && value.__type === 'Date') {
          return new Date(value.value);
        }
        return value;
      });

      return parsed as T;
    } catch (error) {
      console.error(`Failed to load data for key ${key}:`, error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem(this.getKey(key));
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    // Only clear keys with our prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  async list(prefix?: string): Promise<string[]> {
    if (typeof window === 'undefined') {
      return [];
    }

    const keys: string[] = [];
    const searchPrefix = prefix ? `${this.keyPrefix}${prefix}` : this.keyPrefix;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(searchPrefix)) {
        // Return the key without the prefix
        keys.push(key.replace(this.keyPrefix, ''));
      }
    }

    return keys;
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{ used: number; available: number }> {
    if (typeof window === 'undefined') {
      return { used: 0, available: 0 };
    }

    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          used += key.length + value.length;
        }
      }
    }

    // Typical localStorage limit is 5-10MB, we'll use 5MB as conservative estimate
    const totalAvailable = 5 * 1024 * 1024; // 5MB in bytes

    return {
      used,
      available: Math.max(0, totalAvailable - used)
    };
  }
}