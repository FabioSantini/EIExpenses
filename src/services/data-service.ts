import type { 
  ExpenseReport, 
  ExpenseLine, 
  OCRResult,
  User,
  ExportSettings 
} from "@/types";

/**
 * Data Service Interface - Contract between UI and data layer
 * This interface works with both MockDataService and AzureDataService
 */
export interface IDataService {
  // User Management
  getCurrentUser(): Promise<User>;
  
  // Expense Reports
  getExpenseReports(): Promise<ExpenseReport[]>;
  getExpenseReport(id: string): Promise<ExpenseReport>;
  createExpenseReport(data: {
    title: string;
    month: number;
    year: number;
    description?: string;
  }): Promise<ExpenseReport>;
  updateExpenseReport(id: string, data: Partial<ExpenseReport>): Promise<ExpenseReport>;
  deleteExpenseReport(id: string): Promise<void>;
  
  // Expense Lines
  getExpenseLines(reportId: string): Promise<ExpenseLine[]>;
  addExpenseLine(reportId: string, line: {
    date: Date;
    type: string;
    description: string;
    amount: number;
    currency?: string;
    receiptUrl?: string;
    metadata?: string;
  }): Promise<ExpenseLine>;
  updateExpenseLine(id: string, data: Partial<ExpenseLine>): Promise<ExpenseLine>;
  deleteExpenseLine(id: string): Promise<void>;
  
  // File Operations
  uploadReceipt(file: File): Promise<string>; // Returns URL or ID
  getReceiptUrl(receiptId: string): Promise<string>;
  downloadReceipt(receiptId: string): Promise<Blob>;
  
  // OCR Operations
  processReceiptOCR(receiptUrl: string): Promise<OCRResult>;
  
  // Autocomplete Suggestions
  getCustomerSuggestions(query?: string): Promise<string[]>;
  getColleagueSuggestions(query?: string): Promise<string[]>;
  updateCustomerUsage(name: string): Promise<void>;
  updateColleagueUsage(name: string): Promise<void>;
  
  // Export Operations
  exportToExcel(reportId: string, settings?: ExportSettings): Promise<Blob>;
  exportToExcelWithReceipts(reportId: string, settings?: ExportSettings): Promise<Blob>;
}