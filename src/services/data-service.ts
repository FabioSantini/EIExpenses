import type {
  ExpenseReport,
  ExpenseLine,
  OCRResult,
  User,
  ExportSettings,
  ExpenseType
} from "@/types";

// Enhanced types for better type safety
export interface CreateExpenseReportInput {
  title: string;
  month: number;
  year: number;
  description?: string;
}

export interface CreateExpenseLineInput {
  date: Date;
  type: ExpenseType;
  description: string;
  amount: number;
  currency?: string;
  receiptId?: string;
  metadata?: any; // Will be processed based on expense type
}

/**
 * Storage Adapter Interface - Abstracting storage implementation
 */
export interface IStorageAdapter {
  save<T>(key: string, data: T): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  getStorageInfo?(): Promise<{ used: number; available: number }>;
}

/**
 * File Storage Interface - Abstracting file operations
 */
export interface IFileStorage {
  store(file: File): Promise<string>; // Returns fileId
  retrieve(fileId: string): Promise<File | null>;
  remove(fileId: string): Promise<void>;
  getUrl(fileId: string): Promise<string>; // Temporary blob URL
  exists(fileId: string): Promise<boolean>;
}

/**
 * Enhanced Data Service Interface - Contract between UI and data layer
 * This interface works with both Enhanced Local DataService and Azure DataService
 */
export interface IDataService {
  // User Management
  getCurrentUser(): Promise<User>;
  setUserContext?(email: string): void;

  // Expense Reports
  getExpenseReports(): Promise<ExpenseReport[]>;
  getExpenseReport(id: string): Promise<ExpenseReport>;
  createExpenseReport(data: CreateExpenseReportInput): Promise<ExpenseReport>;
  updateExpenseReport(id: string, data: Partial<ExpenseReport>): Promise<ExpenseReport>;
  deleteExpenseReport(id: string): Promise<void>;

  // Expense Lines
  getExpenseLines(reportId: string): Promise<ExpenseLine[]>;
  addExpenseLine(reportId: string, line: CreateExpenseLineInput): Promise<ExpenseLine>;
  updateExpenseLine(id: string, data: Partial<ExpenseLine>): Promise<ExpenseLine>;
  deleteExpenseLine(id: string): Promise<void>;

  // File Operations
  uploadReceipt(file: File, reportId?: string): Promise<string>; // Returns fileId
  getReceiptUrl(receiptId: string): Promise<string>;
  downloadReceipt(receiptId: string): Promise<Blob>;
  removeReceipt(receiptId: string): Promise<void>;

  // OCR Operations
  processReceiptOCR(receiptId: string): Promise<OCRResult>;

  // Autocomplete Suggestions
  getCustomerSuggestions(query?: string): Promise<string[]>;
  getColleagueSuggestions(query?: string): Promise<string[]>;
  updateCustomerUsage(name: string): Promise<void>;
  updateColleagueUsage(name: string): Promise<void>;

  // Export Operations
  exportToExcel(reportIds: string[], targetCurrency: string, settings?: ExportSettings): Promise<Blob>;
  exportToExcelWithReceipts(reportId: string, settings?: ExportSettings): Promise<Blob>;

  // System Operations
  clearAllData(): Promise<void>;
  getStorageInfo(): Promise<{ used: number; available: number }>;
}