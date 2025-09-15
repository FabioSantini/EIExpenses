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

// Import the consolidated interfaces from services
export type {
  IDataService,
  IStorageAdapter,
  IFileStorage,
  CreateExpenseReportInput,
  CreateExpenseLineInput
} from "../services/data-service";

// Export types for reuse
export * from "../lib/validations";