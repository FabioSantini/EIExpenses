import { IDataService, CreateExpenseReportInput, CreateExpenseLineInput } from './data-service';
import type { ExpenseReport, ExpenseLine, ExpenseType, User, OCRResult, ExportSettings } from '@/types';

export class AzureSqlDataService implements IDataService {
  private userEmail: string = 'dotnetcsharp@hotmail.com';
  private baseUrl: string;

  constructor() {
    // Use the current origin for API calls
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
    console.log('🔷 AzureSqlDataService: Created with baseUrl:', this.baseUrl);
  }

  setUserContext(email: string): void {
    this.userEmail = email;
  }

  private async fetchApi(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  async getCurrentUser(): Promise<User> {
    return {
      id: this.userEmail,
      name: 'User',
      email: this.userEmail,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async getExpenseReports(): Promise<ExpenseReport[]> {
    console.log('🗄️ AzureSqlDataService.getExpenseReports: Calling API /reports');
    const response = await this.fetchApi('/api/reports');
    return response.json();
  }

  async getExpenseReport(id: string): Promise<ExpenseReport> {
    console.log(`🗄️ AzureSqlDataService.getExpenseReport: Calling API /reports/${id}`);
    const response = await this.fetchApi(`/api/reports/${id}`);
    return response.json();
  }

  async createExpenseReport(data: CreateExpenseReportInput): Promise<ExpenseReport> {
    console.log('🗄️ AzureSqlDataService.createExpenseReport: Calling API /reports');
    const response = await this.fetchApi('/api/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async updateExpenseReport(id: string, data: Partial<ExpenseReport>): Promise<ExpenseReport> {
    console.log(`🗄️ AzureSqlDataService.updateExpenseReport: Calling API /reports/${id}`);
    const response = await this.fetchApi(`/api/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async deleteExpenseReport(id: string): Promise<void> {
    console.log(`🗄️ AzureSqlDataService.deleteExpenseReport: Calling API /reports/${id}`);
    await this.fetchApi(`/api/reports/${id}`, {
      method: 'DELETE',
    });
  }

  async getExpenseLines(reportId: string): Promise<ExpenseLine[]> {
    console.log(`🗄️ AzureSqlDataService.getExpenseLines: Calling API /expenses?reportId=${reportId}`);
    console.log(`🔷 AzureSqlDataService: Using Azure SQL service, NOT mock data`);
    try {
      const response = await this.fetchApi(`/api/expenses?reportId=${reportId}`);
      const data = await response.json();
      console.log(`🔷 AzureSqlDataService.getExpenseLines: Received ${data.length} expenses from Azure SQL`);
      return data;
    } catch (error) {
      console.error(`❌ AzureSqlDataService.getExpenseLines: Error fetching from Azure SQL:`, error);
      throw error;
    }
  }

  async addExpenseLine(reportId: string, line: CreateExpenseLineInput): Promise<ExpenseLine> {
    console.log('🗄️ AzureSqlDataService.addExpenseLine: Calling API /expenses');
    const response = await this.fetchApi('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({ ...line, reportId }),
    });
    return response.json();
  }

  async updateExpenseLine(id: string, data: Partial<ExpenseLine>): Promise<ExpenseLine> {
    console.log(`🗄️ AzureSqlDataService.updateExpenseLine: Calling API /expenses/${id}`);
    const response = await this.fetchApi(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async deleteExpenseLine(id: string): Promise<void> {
    console.log(`🗄️ AzureSqlDataService.deleteExpenseLine: Calling API /expenses/${id}`);
    await this.fetchApi(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // Real implementation for file operations
  async uploadReceipt(file: File, reportId?: string): Promise<string> {
    console.log('🗄️ AzureSqlDataService.uploadReceipt: Calling API /receipts/upload');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('expenseId', reportId || 'temp-upload'); // Use reportId for folder organization

    const response = await fetch(`${this.baseUrl}/api/receipts/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data.blobUrl;
  }

  async getReceiptUrl(receiptId: string): Promise<string> {
    // TODO: Implement Azure Blob Storage URL generation via API
    console.log('🗄️ AzureSqlDataService.getReceiptUrl: TODO - implement API call');
    return 'placeholder-url';
  }

  async downloadReceipt(receiptId: string): Promise<Blob> {
    // TODO: Implement Azure Blob Storage download via API
    console.log('🗄️ AzureSqlDataService.downloadReceipt: TODO - implement API call');
    return new Blob();
  }

  async removeReceipt(receiptId: string): Promise<void> {
    // TODO: Implement Azure Blob Storage removal via API
    console.log('🗄️ AzureSqlDataService.removeReceipt: TODO - implement API call');
  }

  // Placeholder implementations for OCR
  async processReceiptOCR(receiptId: string): Promise<OCRResult> {
    // TODO: Implement OpenAI GPT-4 Vision OCR via API
    console.log('🗄️ AzureSqlDataService.processReceiptOCR: TODO - implement API call');
    return {
      success: false,
      extractedData: {},
      confidence: 0,
      rawText: '',
      processingTime: 0
    };
  }

  // Autocomplete suggestions - TODO: Create API routes for these
  async getCustomerSuggestions(query?: string): Promise<string[]> {
    try {
      const url = new URL('/api/suggestions/customers', window.location.origin);
      if (query) {
        url.searchParams.set('q', query);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Failed to fetch customer suggestions:', error);
      return [];
    }
  }

  async getColleagueSuggestions(query?: string): Promise<string[]> {
    try {
      const url = new URL('/api/suggestions/colleagues', window.location.origin);
      if (query) {
        url.searchParams.set('q', query);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Failed to fetch colleague suggestions:', error);
      return [];
    }
  }

  async updateCustomerUsage(name: string): Promise<void> {
    // TODO: Implement API call to /api/suggestions/customers/usage
  }

  async updateColleagueUsage(name: string): Promise<void> {
    // TODO: Implement API call to /api/suggestions/colleagues/usage
  }

  // Placeholder implementations for export
  async exportToExcel(reportId: string, settings?: ExportSettings): Promise<Blob> {
    // TODO: Implement Excel export via API
    console.log('🗄️ AzureSqlDataService.exportToExcel: TODO - implement API call');
    return new Blob();
  }

  async exportToExcelWithReceipts(reportId: string, settings?: ExportSettings): Promise<Blob> {
    // TODO: Implement Excel export with receipts via API
    console.log('🗄️ AzureSqlDataService.exportToExcelWithReceipts: TODO - implement API call');
    return new Blob();
  }

  // System operations
  async clearAllData(): Promise<void> {
    console.log('🗄️ AzureSqlDataService.clearAllData: TODO - implement API call');
    // TODO: Create API route for clearing all user data
  }

  async getStorageInfo(): Promise<{ used: number; available: number }> {
    console.log('🗄️ AzureSqlDataService.getStorageInfo: TODO - implement API call');
    // TODO: Implement storage info calculation via API
    return { used: 0, available: 1000000 };
  }
}