import type {
  ExpenseReport,
  ExpenseLine,
  User,
  OCRResult,
  ExportSettings
} from "@/types";
import {
  IDataService,
  CreateExpenseLineInput,
  CreateExpenseReportInput
} from "./data-service";
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
    
    console.log('MockDataService: Initializing data...', {
      hasExistingData: this.getData().reports.length,
      seedDataEnabled: mockConfig.seedData,
      shouldGenerateData: !this.getData().reports.length && mockConfig.seedData
    });
    
    if (!this.getData().reports.length && mockConfig.seedData) {
      console.log('MockDataService: Generating sample data...');
      
      // Generate initial sample data
      const reports = MockDataGenerator.generateExpenseReports();
      const expenses: ExpenseLine[] = [];
      
      // Generate expense lines for each report and update totals
      reports.forEach(report => {
        const lines = MockDataGenerator.generateExpenseLines(report.id!);
        expenses.push(...lines);
        // Update report totals
        report.totalAmount = lines.reduce((sum, line) => sum + line.amount, 0);
        report.lineCount = lines.length;
      });

      console.log('MockDataService: Generated data:', {
        reportsCount: reports.length,
        expensesCount: expenses.length,
        sampleReport: reports[0]
      });

      this.saveData({
        user: MockDataGenerator.users[0],
        reports,
        expenses,
        customers: MockDataGenerator.customers.slice(),
        colleagues: MockDataGenerator.colleagues.slice(),
      });
      
      console.log('MockDataService: Data saved to localStorage');
    } else {
      console.log('MockDataService: Using existing data or seed disabled');
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
    
    // For debugging: let's create some test data if none exists
    const data = this.getData();
    console.log('MockDataService.getExpenseReports:', {
      reportsCount: data.reports.length,
      seedDataEnabled: mockConfig.seedData
    });
    
    // If no data exists, create some test reports immediately
    if (data.reports.length === 0) {
      console.log('No reports found, creating test data...');
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      const testReports: ExpenseReport[] = [
        {
          id: 'test-1',
          userId: 'user_1',
          title: `Current Month Report ${currentMonth}/${currentYear}`,
          month: currentMonth,
          year: currentYear,
          description: 'Current month expense report for testing',
          status: 'draft',
          totalAmount: 750.75,
          lineCount: 5,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'test-2',
          userId: 'user_1',
          title: 'Test Report March 2025',
          month: 3,
          year: 2025,
          description: 'Test expense report for debugging',
          status: 'submitted',
          totalAmount: 1250.50,
          lineCount: 8,
          createdAt: new Date('2025-03-01'),
          updatedAt: new Date('2025-03-15')
        },
        {
          id: 'test-3',
          userId: 'user_1',
          title: 'Test Report February 2025',
          month: 2,
          year: 2025,
          description: 'Another test report',
          status: 'approved',
          totalAmount: 980.25,
          lineCount: 6,
          createdAt: new Date('2025-02-01'),
          updatedAt: new Date('2025-02-28')
        }
      ];
      console.log('Returning test reports:', testReports);
      return testReports;
    }
    
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

  async createExpenseReport(data: CreateExpenseReportInput): Promise<ExpenseReport> {
    await delay(mockConfig.dataDelay);
    
    const newReport: ExpenseReport = {
      id: generateId(),
      userId: "user_1",
      title: data.title,
      month: data.month,
      year: data.year,
      description: data.description,
      status: "draft",
      totalAmount: 0,
      lineCount: 0,
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
    let expenses = data.expenses
      .filter((e: any) => e.reportId === reportId)
      .map((e: any) => ({
        ...e,
        date: new Date(e.date),
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      }))
      .sort((a: ExpenseLine, b: ExpenseLine) => b.date.getTime() - a.date.getTime());

    // If no expenses exist for this report, generate some test expenses
    if (expenses.length === 0) {
      console.log(`No expenses found for report ${reportId}, creating test expenses...`);

      const testExpenses: ExpenseLine[] = [
        {
          id: `exp-${reportId}-1`,
          reportId: reportId,
          date: new Date('2025-09-10'),
          type: 'LUNCH',
          description: 'Business lunch at Ristorante Roma',
          amount: 45.50,
          currency: 'EUR',
          receiptId: 'test-receipt-1.jpg',
          ocrProcessed: false,
          metadata: { type: 'LUNCH', data: { customer: 'ABC Corp', colleagues: ['Mario Rossi'] } },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: `exp-${reportId}-2`,
          reportId: reportId,
          date: new Date('2025-09-09'),
          type: 'FUEL',
          description: 'Benzina Eni - Autostrada A1',
          amount: 65.00,
          currency: 'EUR',
          receiptId: undefined,
          ocrProcessed: false,
          metadata: { type: 'FUEL', data: { startLocation: 'Milano', endLocation: 'Roma', distance: 125 } },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: `exp-${reportId}-3`,
          reportId: reportId,
          date: new Date('2025-09-08'),
          type: 'PARKING',
          description: 'Parcheggio centro storico',
          amount: 8.50,
          currency: 'EUR',
          receiptId: 'test-receipt-3.jpg',
          ocrProcessed: false,
          metadata: { type: 'PARKING', data: { duration: '4 hours', zone: 'blue' } },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: `exp-${reportId}-4`,
          reportId: reportId,
          date: new Date('2025-09-07'),
          type: 'HOTEL',
          description: 'Hotel Marriott - 1 night',
          amount: 180.00,
          currency: 'EUR',
          receiptId: 'test-receipt-4.jpg',
          ocrProcessed: false,
          metadata: { type: 'HOTEL', data: { location: 'Milano', nights: 1, room: 'Standard Double' } },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: `exp-${reportId}-5`,
          reportId: reportId,
          date: new Date('2025-09-06'),
          type: 'TRAIN',
          description: 'Trenitalia Roma-Milano',
          amount: 89.90,
          currency: 'EUR',
          receiptId: undefined,
          ocrProcessed: false,
          metadata: { type: 'TRAIN', data: { route: 'Roma-Milano', class: '2nd' } },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Save the generated test expenses to localStorage so they can be updated later
      const stored = this.getData();
      stored.expenses.push(...testExpenses);
      this.saveData(stored);

      console.log(`Generated and saved ${testExpenses.length} test expenses for report ${reportId}`);
      return testExpenses;
    }
    
    return expenses;
  }

  async addExpenseLine(reportId: string, line: CreateExpenseLineInput): Promise<ExpenseLine> {
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
      receiptId: line.receiptId,
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
      let customer = "";
      let colleagues = "";

      // Handle new typed metadata format
      if (expense.metadata) {
        if (typeof expense.metadata === 'object' && expense.metadata.data) {
          customer = expense.metadata.data.customer || "";
          colleagues = Array.isArray(expense.metadata.data.colleagues)
            ? expense.metadata.data.colleagues.join(", ")
            : expense.metadata.data.colleagues || "";
        } else if (typeof expense.metadata === 'string') {
          try {
            const parsed = JSON.parse(expense.metadata);
            customer = parsed.customer || "";
            colleagues = parsed.colleagues || "";
          } catch {
            // Ignore parsing errors
          }
        }
      }

      const hasReceipt = expense.receiptId ? "Yes" : "No";

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

  async removeReceipt(receiptId: string): Promise<void> {
    await delay(mockConfig.dataDelay);
    // In mock service, receipts are just URLs so we simulate removal
    console.log(`Mock: Removing receipt ${receiptId}`);
  }

  async clearAllData(): Promise<void> {
    await delay(mockConfig.dataDelay);
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      const data = JSON.parse(stored);
      data.reports = [];
      data.expenses = [];
      data.customers = [];
      data.colleagues = [];
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
  }

  async getStorageInfo(): Promise<{ used: number; available: number }> {
    await delay(mockConfig.dataDelay);
    // Simulate storage info
    const storageUsed = localStorage.getItem(this.storageKey)?.length || 0;
    return {
      used: storageUsed,
      available: 5 * 1024 * 1024 - storageUsed // 5MB limit for localStorage
    };
  }
}