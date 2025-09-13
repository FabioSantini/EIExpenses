// Re-export all validation types
export * from "../lib/validations";
import type { ExpenseLine, ExpenseReport, OCRResult } from "../lib/validations";

// Additional UI types
export interface ButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

// Mock data types
export interface MockDataService {
  expenses: ExpenseLine[];
  reports: ExpenseReport[];
  customers: string[];
  colleagues: string[];
}

// Service interfaces (to be implemented)
export interface IDataService {
  // Expense Reports
  getExpenseReports(): Promise<ExpenseReport[]>;
  getExpenseReport(_id: string): Promise<ExpenseReport>;
  createExpenseReport(_data: Omit<ExpenseReport, "id" | "createdAt" | "updatedAt">): Promise<ExpenseReport>;
  updateExpenseReport(_id: string, _data: Partial<ExpenseReport>): Promise<ExpenseReport>;
  deleteExpenseReport(_id: string): Promise<void>;
  
  // Expense Lines
  getExpenseLines(_reportId: string): Promise<ExpenseLine[]>;
  addExpenseLine(_reportId: string, _line: Omit<ExpenseLine, "id" | "reportId" | "createdAt" | "updatedAt">): Promise<ExpenseLine>;
  updateExpenseLine(_id: string, _data: Partial<ExpenseLine>): Promise<ExpenseLine>;
  deleteExpenseLine(_id: string): Promise<void>;
  
  // File operations
  uploadReceipt(_file: File): Promise<string>;
  getReceiptUrl(_receiptId: string): Promise<string>;
  downloadReceipt(_receiptId: string): Promise<Blob>;
  
  // OCR operations  
  processReceiptOCR(_receiptUrl: string): Promise<OCRResult>;
  
  // Suggestions
  getCustomerSuggestions(_query: string): Promise<string[]>;
  getColleagueSuggestions(_query: string): Promise<string[]>;
  
  // Export
  exportToExcel(_reportId: string): Promise<Blob>;
  exportToExcelWithReceipts(_reportId: string): Promise<Blob>;
}

// Export types for reuse
export * from "../lib/validations";