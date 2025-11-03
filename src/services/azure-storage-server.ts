import { BlobServiceClient } from '@azure/storage-blob';

export interface UploadReceiptResult {
  success: boolean;
  blobUrl?: string;
  error?: string;
}

export interface ReceiptMetadata {
  originalName: string;
  mimeType: string;
  size: string; // Changed to string for Azure compatibility
  expenseId: string;
  userId: string;
  uploadedAt: string;
}

class AzureStorageServerService {
  private blobServiceClient: BlobServiceClient | null = null;
  private accountName: string;
  private containerName: string;

  constructor() {
    try {
      // Get configuration from environment variables
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'saeiexpenses';
      this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'receipts';
      
      if (!connectionString) {
        throw new Error('Azure Storage connection string not configured. Please set AZURE_STORAGE_CONNECTION_STRING in .env.local');
      }
      
      // Create blob service client from connection string
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

      console.log('✅ Azure Storage service initialized successfully');
      console.log(`📦 Using container: ${this.containerName}`);
    } catch (error) {
      console.error('❌ Failed to initialize Azure Storage service:', error);
    }
  }

  /**
   * Upload receipt image to Azure Blob Storage
   */
  async uploadReceipt(
    file: File,
    expenseId: string,
    userId: string, // Will be provided by API route from session
    expenseLineId?: string // Optional: actual expense line ID from database
  ): Promise<UploadReceiptResult> {
    try {
      if (!this.blobServiceClient) {
        throw new Error('Azure Storage service not initialized');
      }

      // Generate unique blob name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtension = this.getFileExtension(file.name);
      const blobName = this.generateBlobName(userId, expenseId, expenseLineId || timestamp, fileExtension);

      console.log(`📤 Uploading receipt to blob: ${blobName}`);

      // Get container client
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);

      // Ensure container exists (no access parameter = private by default)
      await containerClient.createIfNotExists();

      // Get block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Prepare metadata - ALL values must be strings for Azure
      const metadata: Record<string, string> = {
        originalName: file.name,
        mimeType: file.type,
        size: file.size.toString(), // Convert to string
        expenseId: expenseId,
        userId: userId,
        uploadedAt: new Date().toISOString()
      };

      // Convert file to Buffer for Node.js environment
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload the file with metadata
      const uploadResponse = await blockBlobClient.upload(
        buffer,
        buffer.length,
        {
          blobHTTPHeaders: {
            blobContentType: file.type,
            blobContentDisposition: `inline; filename="${file.name}"`
          },
          metadata: metadata
        }
      );

      if (uploadResponse.errorCode) {
        throw new Error(`Upload failed: ${uploadResponse.errorCode}`);
      }

      const blobUrl = blockBlobClient.url;
      console.log(`✅ Receipt uploaded successfully: ${blobUrl}`);

      return {
        success: true,
        blobUrl: blobUrl
      };

    } catch (error) {
      console.error('❌ Receipt upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Delete receipt from Azure Blob Storage
   */
  async deleteReceipt(blobUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.blobServiceClient) {
        throw new Error('Azure Storage service not initialized');
      }

      // Extract blob name from URL
      const blobName = this.extractBlobNameFromUrl(blobUrl);
      if (!blobName) {
        throw new Error('Invalid blob URL');
      }

      console.log(`🗑️ Deleting receipt blob: ${blobName}`);

      // Get container client
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Delete the blob
      const deleteResponse = await containerClient.deleteBlob(blobName);

      if (deleteResponse.errorCode) {
        throw new Error(`Delete failed: ${deleteResponse.errorCode}`);
      }

      console.log(`✅ Receipt deleted successfully: ${blobName}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Receipt deletion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deletion error'
      };
    }
  }

  /**
   * Generate a secure SAS URL for accessing a blob (simplified for now)
   */
  generateSasUrl(blobUrl: string, expiryHours: number = 24): string {
    // For now, return the direct blob URL since container has public read access
    console.log(`🔐 Using direct blob URL (public container): ${blobUrl}`);
    return blobUrl;
  }

  /**
   * Generate blob name with proper structure
   */
  private generateBlobName(
    userId: string, 
    expenseId: string, 
    lineIdOrTimestamp: string, 
    extension: string
  ): string {
    // Better structure: users/{userId}/{expenseId}/{expenseLineId}.{ext}
    // If lineIdOrTimestamp looks like a timestamp, prefix with 'line-'
    // If it's already a proper ID, use as-is
    const expenseLineId = lineIdOrTimestamp.includes('-') && lineIdOrTimestamp.length > 15
      ? `line-${lineIdOrTimestamp}` // It's a timestamp
      : lineIdOrTimestamp; // It's already a proper ID
    
    return `users/${userId}/${expenseId}/${expenseLineId}.${extension}`;
  }

  /**
   * Extract blob name from full blob URL
   */
  private extractBlobNameFromUrl(blobUrl: string): string | null {
    try {
      const url = new URL(blobUrl);
      const pathSegments = url.pathname.split('/');
      
      // Remove empty first segment and container name
      if (pathSegments.length >= 3 && pathSegments[1] === this.containerName) {
        return pathSegments.slice(2).join('/');
      }
      
      return null;
    } catch (error) {
      console.error('Failed to extract blob name from URL:', error);
      return null;
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return 'jpg'; // Default extension
    return filename.substring(lastDot + 1).toLowerCase();
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return !!this.blobServiceClient;
  }

  /**
   * Get service status
   */
  getStatus(): string {
    if (this.isAvailable()) {
      return `✅ Connected to Azure Storage: ${this.accountName}`;
    } else {
      return '❌ Azure Storage service not available';
    }
  }

  /**
   * Get container info
   */
  getContainerInfo(): { accountName: string; containerName: string } {
    return {
      accountName: this.accountName,
      containerName: this.containerName
    };
  }
}

// Export singleton instance (server-side only)
export const azureStorageServerService = new AzureStorageServerService();
export { AzureStorageServerService };