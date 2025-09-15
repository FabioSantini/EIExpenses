import type { IFileStorage } from "../data-service";

interface StoredFile {
  fileId: string;
  name: string;
  type: string;
  size: number;
  buffer: ArrayBuffer;
  createdAt: string;
  metadata?: {
    originalName: string;
    uploadedBy?: string;
    tags?: string[];
  };
}

/**
 * IndexedDB File Storage for receipt and document persistence
 * Handles large files with cross-session persistence
 */
export class IndexedDBFileStorage implements IFileStorage {
  private dbName = "ei-expenses-files";
  private dbVersion = 1;
  private storeName = "files";
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
        reject(new Error(`Failed to open files database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'fileId' });

          // Create indexes for efficient querying
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  private async getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], mode);
    return transaction.objectStore(this.storeName);
  }

  async store(file: File): Promise<string> {
    try {
      // Validate file
      if (!file || file.size === 0) {
        throw new Error('Invalid file provided');
      }

      // Check file size (max 50MB per file)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error(`File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`);
      }

      // Generate unique file ID
      const fileId = crypto.randomUUID();

      // Convert file to ArrayBuffer
      const buffer = await file.arrayBuffer();

      // Create stored file object
      const storedFile: StoredFile = {
        fileId,
        name: file.name,
        type: file.type,
        size: file.size,
        buffer,
        createdAt: new Date().toISOString(),
        metadata: {
          originalName: file.name,
          uploadedBy: 'current-user', // TODO: Get from auth context
          tags: this.extractTagsFromFile(file)
        }
      };

      // Store in IndexedDB
      const store = await this.getStore('readwrite');

      await new Promise<void>((resolve, reject) => {
        const request = store.add(storedFile);

        request.onsuccess = () => {
          console.log(`File stored successfully: ${fileId} (${file.name})`);
          resolve();
        };

        request.onerror = () => {
          reject(new Error(`Failed to store file: ${request.error?.message}`));
        };
      });

      return fileId;
    } catch (error) {
      throw new Error(`File storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async retrieve(fileId: string): Promise<File | null> {
    try {
      const store = await this.getStore('readonly');

      return new Promise<File | null>((resolve, reject) => {
        const request = store.get(fileId);

        request.onsuccess = () => {
          const result = request.result as StoredFile;
          if (!result) {
            resolve(null);
            return;
          }

          try {
            // Reconstruct File object from stored data
            const file = new File([result.buffer], result.name, {
              type: result.type,
              lastModified: new Date(result.createdAt).getTime()
            });

            resolve(file);
          } catch (error) {
            console.error(`Failed to reconstruct file ${fileId}:`, error);
            resolve(null);
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to retrieve file: ${request.error?.message}`));
        };
      });
    } catch (error) {
      console.error(`File retrieval failed for ${fileId}:`, error);
      return null;
    }
  }

  async remove(fileId: string): Promise<void> {
    try {
      const store = await this.getStore('readwrite');

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(fileId);

        request.onsuccess = () => {
          console.log(`File removed successfully: ${fileId}`);
          resolve();
        };

        request.onerror = () => {
          reject(new Error(`Failed to remove file: ${request.error?.message}`));
        };
      });
    } catch (error) {
      throw new Error(`File removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUrl(fileId: string): Promise<string> {
    try {
      const file = await this.retrieve(fileId);
      if (!file) {
        throw new Error(`File not found: ${fileId}`);
      }

      // Create temporary blob URL (will be cleaned up automatically)
      const url = URL.createObjectURL(file);

      // Auto-cleanup after 1 hour to prevent memory leaks
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60 * 60 * 1000); // 1 hour

      return url;
    } catch (error) {
      throw new Error(`Failed to generate file URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(fileId: string): Promise<boolean> {
    try {
      const store = await this.getStore('readonly');

      return new Promise<boolean>((resolve, reject) => {
        const request = store.count(fileId);

        request.onsuccess = () => {
          resolve(request.result > 0);
        };

        request.onerror = () => {
          reject(new Error(`Failed to check file existence: ${request.error?.message}`));
        };
      });
    } catch (error) {
      console.error(`File existence check failed for ${fileId}:`, error);
      return false;
    }
  }

  /**
   * Get all stored files with metadata
   */
  async listFiles(): Promise<Array<{ fileId: string; name: string; type: string; size: number; createdAt: string }>> {
    try {
      const store = await this.getStore('readonly');

      return new Promise<any[]>((resolve, reject) => {
        const files: any[] = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const file = cursor.value as StoredFile;
            files.push({
              fileId: file.fileId,
              name: file.name,
              type: file.type,
              size: file.size,
              createdAt: file.createdAt
            });
            cursor.continue();
          } else {
            resolve(files);
          }
        };

        request.onerror = () => {
          reject(new Error(`Failed to list files: ${request.error?.message}`));
        };
      });
    } catch (error) {
      console.error('File listing failed:', error);
      return [];
    }
  }

  /**
   * Get storage usage for files
   */
  async getStorageInfo(): Promise<{ totalFiles: number; totalSize: number; averageFileSize: number }> {
    try {
      const files = await this.listFiles();
      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;

      return {
        totalFiles,
        totalSize,
        averageFileSize
      };
    } catch (error) {
      console.error('Failed to get file storage info:', error);
      return { totalFiles: 0, totalSize: 0, averageFileSize: 0 };
    }
  }

  /**
   * Clean up old files (older than specified days)
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffISO = cutoffDate.toISOString();

      const files = await this.listFiles();
      const filesToDelete = files.filter(file => file.createdAt < cutoffISO);

      let deletedCount = 0;
      for (const file of filesToDelete) {
        try {
          await this.remove(file.fileId);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete old file ${file.fileId}:`, error);
        }
      }

      console.log(`Cleaned up ${deletedCount} old files`);
      return deletedCount;
    } catch (error) {
      console.error('File cleanup failed:', error);
      return 0;
    }
  }

  private extractTagsFromFile(file: File): string[] {
    const tags: string[] = [];

    // Add type-based tags
    if (file.type.startsWith('image/')) {
      tags.push('image', 'receipt');
    } else if (file.type.includes('pdf')) {
      tags.push('pdf', 'document');
    }

    // Add size-based tags
    if (file.size > 5 * 1024 * 1024) { // > 5MB
      tags.push('large');
    } else if (file.size < 100 * 1024) { // < 100KB
      tags.push('small');
    }

    return tags;
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