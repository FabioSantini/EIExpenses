import type { 
  ExpenseReport, 
  ExpenseLine, 
  User, 
  OCRResult,
  ExportSettings 
} from "@/types";
import { IDataService } from "./data-service";
import { MockDataGenerator } from "./mock-data";
import { generateId, delay, formatCurrency } from "@/lib/utils";
import { mockConfig } from "@/lib/env";

/**
 * Mock Data Service - In-memory implementation for development
 * Simulates all operations with localStorage persistence
 */
export class MockDataService implements IDataService {
  private storageKey = "ei-expenses-mock-data";

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.initializeData();
    }
  }

  private initializeData(): void {
    if (typeof window === 'undefined') return;
    
    if (!this.getData().reports.length && mockConfig.seedData) {
      // Generate initial sample data
      const reports = MockDataGenerator.generateExpenseReports();
      const expenses: ExpenseLine[] = [];
      
      // Generate expense lines for each report
      reports.forEach(report => {
        const lines = MockDataGenerator.generateExpenseLines(report.id);
        expenses.push(...lines);
      });

      this.saveData({
        user: MockDataGenerator.users[0],
        reports,
        expenses,
        customers: MockDataGenerator.customers.slice(),
        colleagues: MockDataGenerator.colleagues.slice(),
      });
    }
  }

  private getData() {
    if (typeof window === 'undefined') {
      // Server-side: return default data
      return {
        user: MockDataGenerator.users[0],
        reports: [],
        expenses: [],
        customers: [],
        colleagues: [],
      };
    }
    
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : {
      user: MockDataGenerator.users[0],
      reports: [],
      expenses: [],
      customers: [],
      colleagues: [],
    };
  }

  private saveData(data: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
  }

  // User Management
  async getCurrentUser(): Promise<User> {
    await delay(mockConfig.dataDelay);
    return this.getData().user;
  }

  // Expense Reports
  async getExpenseReports(): Promise<ExpenseReport[]> {
    await delay(mockConfig.dataDelay);
    const data = this.getData();
    return data.reports.map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
      exportedAt: r.exportedAt ? new Date(r.exportedAt) : undefined,
    }));
  }

  async getExpenseReport(id: string): Promise<ExpenseReport> {
    await delay(mockConfig.dataDelay);
    const reports = await this.getExpenseReports();
    const report = reports.find(r => r.id === id);
    if (!report) {
      throw new Error(`Expense report with id ${id} not found`);
    }
    return report;
  }

  async createExpenseReport(data: {
    title: string;
    month: number;
    year: number;
    description?: string;
  }): Promise<ExpenseReport> {
    await delay(mockConfig.dataDelay);
    
    const newReport: ExpenseReport = {
      id: generateId(),
      userId: "user_1",
      title: data.title,
      month: data.month,
      year: data.year,
      description: data.description,
      exportedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const stored = this.getData();
    stored.reports.push(newReport);
    this.saveData(stored);

    return newReport;
  }

  async updateExpenseReport(id: string, data: Partial<ExpenseReport>): Promise<ExpenseReport> {
    await delay(mockConfig.dataDelay);
    
    const stored = this.getData();
    const reportIndex = stored.reports.findIndex((r: any) => r.id === id);
    if (reportIndex === -1) {
      throw new Error(`Expense report with id ${id} not found`);
    }

    stored.reports[reportIndex] = {
      ...stored.reports[reportIndex],
      ...data,
      updatedAt: new Date(),
    };
    this.saveData(stored);

    return this.getExpenseReport(id);
  }

  async deleteExpenseReport(id: string): Promise<void> {
    await delay(mockConfig.dataDelay);
    
    const stored = this.getData();
    stored.reports = stored.reports.filter((r: any) => r.id !== id);
    stored.expenses = stored.expenses.filter((e: any) => e.reportId !== id);
    this.saveData(stored);
  }

  // Expense Lines
  async getExpenseLines(reportId: string): Promise<ExpenseLine[]> {
    await delay(mockConfig.dataDelay);
    
    const data = this.getData();
    return data.expenses
      .filter((e: any) => e.reportId === reportId)
      .map((e: any) => ({
        ...e,
        date: new Date(e.date),
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      }))
      .sort((a: ExpenseLine, b: ExpenseLine) => b.date.getTime() - a.date.getTime());
  }

  async addExpenseLine(reportId: string, line: {
    date: Date;
    type: string;
    description: string;
    amount: number;
    currency?: string;
    receiptUrl?: string;
    metadata?: string;
  }): Promise<ExpenseLine> {
    await delay(mockConfig.dataDelay);
    
    // Verify report exists
    await this.getExpenseReport(reportId);

    const newLine: ExpenseLine = {
      id: generateId(),
      reportId: reportId,
      date: line.date,
      type: line.type,
      description: line.description,
      amount: line.amount,
      currency: line.currency || "EUR",
      receiptUrl: line.receiptUrl,
      ocrProcessed: false,
      ocrData: undefined,
      metadata: line.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const stored = this.getData();
    stored.expenses.push(newLine);
    
    // Update report timestamp
    const reportIndex = stored.reports.findIndex((r: any) => r.id === reportId);
    if (reportIndex !== -1) {
      stored.reports[reportIndex].updatedAt = new Date();
    }

    this.saveData(stored);
    return newLine;
  }

  async updateExpenseLine(id: string, data: Partial<ExpenseLine>): Promise<ExpenseLine> {
    await delay(mockConfig.dataDelay);
    
    const stored = this.getData();
    const lineIndex = stored.expenses.findIndex((e: any) => e.id === id);
    if (lineIndex === -1) {
      throw new Error(`Expense line with id ${id} not found`);
    }

    stored.expenses[lineIndex] = {
      ...stored.expenses[lineIndex],
      ...data,
      updatedAt: new Date(),
    };
    this.saveData(stored);

    const line = stored.expenses[lineIndex];
    return {
      ...line,
      date: new Date(line.date),
      createdAt: new Date(line.createdAt),
      updatedAt: new Date(line.updatedAt),
    };
  }

  async deleteExpenseLine(id: string): Promise<void> {
    await delay(mockConfig.dataDelay);
    
    const stored = this.getData();
    stored.expenses = stored.expenses.filter((e: any) => e.id !== id);
    this.saveData(stored);
  }

  // File Operations
  async uploadReceipt(file: File): Promise<string> {
    await delay(mockConfig.dataDelay * 2); // Longer delay for file upload
    
    // Create a blob URL for the file (will work in browser)
    const url = URL.createObjectURL(file);
    return url;
  }

  async getReceiptUrl(receiptId: string): Promise<string> {
    await delay(mockConfig.dataDelay);
    return receiptId; // In mock, the ID is already the URL
  }

  async downloadReceipt(receiptId: string): Promise<Blob> {
    await delay(mockConfig.dataDelay);
    
    // Generate a mock image blob
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;
    
    // Draw a mock receipt
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 600);
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.fillText('MOCK RECEIPT', 20, 40);
    ctx.fillText('Receipt ID: ' + receiptId.substring(0, 8), 20, 70);
    ctx.fillText('Date: ' + new Date().toLocaleDateString(), 20, 100);
    ctx.fillText('Amount: €45.50', 20, 130);
    ctx.fillText('This is a mock receipt', 20, 160);
    ctx.fillText('for testing purposes.', 20, 180);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      });
    });
  }

  // OCR Operations
  async processReceiptOCR(receiptUrl: string): Promise<OCRResult> {
    await delay(mockConfig.ocrDelay); // Longer delay to simulate OCR processing
    
    // Generate realistic OCR result
    return MockDataGenerator.generateOCRResult();
  }

  // Autocomplete Suggestions
  async getCustomerSuggestions(query?: string): Promise<string[]> {
    await delay(mockConfig.dataDelay / 2);
    
    const data = this.getData();
    const customers = data.customers as string[];
    
    if (!query) return customers.slice(0, 10);
    
    return customers
      .filter(c => c.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
  }

  async getColleagueSuggestions(query?: string): Promise<string[]> {
    await delay(mockConfig.dataDelay / 2);
    
    const data = this.getData();
    const colleagues = data.colleagues as string[];
    
    if (!query) return colleagues.slice(0, 10);
    
    return colleagues
      .filter(c => c.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
  }

  async updateCustomerUsage(name: string): Promise<void> {
    await delay(mockConfig.dataDelay / 4);
    
    const stored = this.getData();
    if (!stored.customers.includes(name)) {
      stored.customers.unshift(name); // Add to beginning
      if (stored.customers.length > 50) {
        stored.customers = stored.customers.slice(0, 50); // Keep only 50
      }
      this.saveData(stored);
    }
  }

  async updateColleagueUsage(name: string): Promise<void> {
    await delay(mockConfig.dataDelay / 4);
    
    const stored = this.getData();
    if (!stored.colleagues.includes(name)) {
      stored.colleagues.unshift(name); // Add to beginning
      if (stored.colleagues.length > 50) {
        stored.colleagues = stored.colleagues.slice(0, 50); // Keep only 50
      }
      this.saveData(stored);
    }
  }

  // Export Operations
  async exportToExcel(reportId: string, settings?: ExportSettings): Promise<Blob> {
    await delay(mockConfig.dataDelay * 3); // Longer delay for export
    
    const report = await this.getExpenseReport(reportId);
    const expenses = await this.getExpenseLines(reportId);
    
    // Generate mock Excel content as CSV for simplicity
    let csvContent = "Date,Type,Description,Amount,Currency,Customer,Colleagues,Receipt\n";
    
    expenses.forEach(expense => {
      const metadata = expense.metadata ? JSON.parse(expense.metadata) : {};
      const customer = metadata.customer || "";
      const colleagues = metadata.colleagues || "";
      const hasReceipt = expense.receiptUrl ? "Yes" : "No";
      
      csvContent += `${expense.date.toLocaleDateString()},${expense.type},${expense.description},${expense.amount},${expense.currency},${customer},${colleagues},${hasReceipt}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    return blob;
  }

  async exportToExcelWithReceipts(reportId: string, settings?: ExportSettings): Promise<Blob> {
    await delay(mockConfig.dataDelay * 4); // Even longer delay for receipts
    
    // In a real implementation, this would create a ZIP file with Excel + receipt images
    // For mock, we'll return the Excel with a note about receipts
    const excelBlob = await this.exportToExcel(reportId, settings);
    
    // Add a note about receipts in the mock
    const text = await excelBlob.text();
    const updatedText = text + "\n\nNote: Receipt files would be included in production version";
    
    return new Blob([updatedText], { type: 'text/csv' });
  }
}