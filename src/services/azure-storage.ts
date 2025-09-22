// Client-side Azure Storage service
// Uses API routes for secure operations

export interface UploadReceiptResult {
  success: boolean;
  blobUrl?: string;
  error?: string;
}

class AzureStorageClientService {
  private accountName: string = 'saeiexpenses';
  private containerName: string = 'receipts';

  constructor() {
    console.log('✅ Azure Storage client service initialized');
  }

  /**
   * Upload receipt image via API route
   */
  async uploadReceipt(
    file: File,
    expenseId: string
  ): Promise<UploadReceiptResult> {
    try {
      console.log(`📤 Uploading receipt via API: ${file.name}`);

      const formData = new FormData();
      formData.append('image', file);
      formData.append('expenseId', expenseId);

      const response = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log(`✅ Receipt uploaded successfully: ${result.data.blobUrl}`);
      return {
        success: true,
        blobUrl: result.data.blobUrl
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
   * Generate a secure SAS URL for accessing a blob (client-side fallback)
   */
  generateSasUrl(blobUrl: string, expiryHours: number = 24): string {
    // For now, return the original URL
    // In production, this should call an API route to generate SAS URLs server-side
    console.log(`🔐 Using direct blob URL (client-side): ${blobUrl}`);
    return blobUrl;
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return true; // Client service is always available
  }

  /**
   * Get service status
   */
  getStatus(): string {
    return `✅ Azure Storage client service ready`;
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

// Export singleton instance
export const azureStorageService = new AzureStorageClientService();
export { AzureStorageClientService };