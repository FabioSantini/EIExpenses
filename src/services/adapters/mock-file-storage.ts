import type { IFileStorage } from "../data-service";

interface MockStoredFile {
  file: File;
  createdAt: string;
  url?: string;
}

/**
 * Mock File Storage for development and testing
 * Stores files in memory with persistence via localStorage metadata
 */
export class MockFileStorage implements IFileStorage {
  private files = new Map<string, MockStoredFile>();
  private storageKey = "ei-expenses:mock-files";

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadMetadata();
    }
  }

  private loadMetadata(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const metadata = JSON.parse(stored);
        // Note: We can only restore metadata, not the actual files
        // Files will need to be re-uploaded after page refresh in mock mode
        console.log('MockFileStorage: Loaded metadata for', Object.keys(metadata).length, 'files');
      }
    } catch (error) {
      console.error('Failed to load file metadata:', error);
    }
  }

  private saveMetadata(): void {
    try {
      const metadata: Record<string, { name: string; type: string; size: number; createdAt: string }> = {};

      this.files.forEach((storedFile, fileId) => {
        metadata[fileId] = {
          name: storedFile.file.name,
          type: storedFile.file.type,
          size: storedFile.file.size,
          createdAt: storedFile.createdAt
        };
      });

      localStorage.setItem(this.storageKey, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save file metadata:', error);
    }
  }

  async store(file: File): Promise<string> {
    try {
      // Validate file
      if (!file || file.size === 0) {
        throw new Error('Invalid file provided');
      }

      // Generate unique file ID
      const fileId = crypto.randomUUID();

      // Create blob URL for the file
      const url = URL.createObjectURL(file);

      // Store in memory
      const storedFile: MockStoredFile = {
        file,
        createdAt: new Date().toISOString(),
        url
      };

      this.files.set(fileId, storedFile);
      this.saveMetadata();

      console.log(`MockFileStorage: Stored file ${fileId} (${file.name})`);
      return fileId;
    } catch (error) {
      throw new Error(`Mock file storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async retrieve(fileId: string): Promise<File | null> {
    const storedFile = this.files.get(fileId);
    if (!storedFile) {
      console.warn(`MockFileStorage: File not found: ${fileId}`);
      return null;
    }

    return storedFile.file;
  }

  async remove(fileId: string): Promise<void> {
    const storedFile = this.files.get(fileId);
    if (storedFile && storedFile.url) {
      // Clean up blob URL
      URL.revokeObjectURL(storedFile.url);
    }

    this.files.delete(fileId);
    this.saveMetadata();

    console.log(`MockFileStorage: Removed file ${fileId}`);
  }

  async getUrl(fileId: string): Promise<string> {
    const storedFile = this.files.get(fileId);
    if (!storedFile) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Return existing URL or create new one
    if (storedFile.url) {
      return storedFile.url;
    }

    // Create new URL if needed
    const url = URL.createObjectURL(storedFile.file);
    storedFile.url = url;
    return url;
  }

  async exists(fileId: string): Promise<boolean> {
    return this.files.has(fileId);
  }

  /**
   * Generate a mock receipt image for testing
   */
  async generateMockReceipt(expenseData: {
    amount: number;
    vendor: string;
    date: string;
    type: string;
  }): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('Canvas not available on server side');
    }

    // Create a canvas for the mock receipt
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    // Draw mock receipt
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 600);

    // Header
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(expenseData.vendor, 20, 40);

    // Divider
    ctx.beginPath();
    ctx.moveTo(20, 60);
    ctx.lineTo(380, 60);
    ctx.stroke();

    // Receipt details
    ctx.font = '16px Arial';
    ctx.fillText(`Date: ${expenseData.date}`, 20, 90);
    ctx.fillText(`Type: ${expenseData.type}`, 20, 120);
    ctx.fillText(`Amount: €${expenseData.amount.toFixed(2)}`, 20, 150);

    // Items section
    ctx.fillText('Items:', 20, 200);
    ctx.font = '14px Arial';
    ctx.fillText('Business expense item', 20, 230);
    ctx.fillText(`€${expenseData.amount.toFixed(2)}`, 300, 230);

    // Footer
    ctx.beginPath();
    ctx.moveTo(20, 280);
    ctx.lineTo(380, 280);
    ctx.stroke();

    ctx.font = 'bold 18px Arial';
    ctx.fillText(`Total: €${expenseData.amount.toFixed(2)}`, 20, 310);

    // Mock signature
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText('Thank you for your business!', 20, 350);
    ctx.fillText(`Receipt ID: ${crypto.randomUUID().substring(0, 8)}`, 20, 370);

    // Convert to blob and store
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate mock receipt'));
          return;
        }

        try {
          const file = new File([blob], `receipt-${Date.now()}.png`, {
            type: 'image/png'
          });

          const fileId = await this.store(file);
          resolve(fileId);
        } catch (error) {
          reject(error);
        }
      }, 'image/png');
    });
  }

  /**
   * Clear all stored files
   */
  async clearAll(): Promise<void> {
    // Clean up all blob URLs
    this.files.forEach((storedFile) => {
      if (storedFile.url) {
        URL.revokeObjectURL(storedFile.url);
      }
    });

    this.files.clear();

    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }

    console.log('MockFileStorage: Cleared all files');
  }

  /**
   * Get storage info
   */
  async getStorageInfo(): Promise<{ totalFiles: number; totalSize: number }> {
    let totalSize = 0;
    this.files.forEach((storedFile) => {
      totalSize += storedFile.file.size;
    });

    return {
      totalFiles: this.files.size,
      totalSize
    };
  }
}