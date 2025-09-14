import { z } from "zod";

// Expense types enum
export const ExpenseType = z.enum([
  "PARKING",
  "FUEL", 
  "TELEPASS",
  "LUNCH",
  "DINNER",
  "HOTEL",
  "TRAIN",
  "BREAKFAST",
  "TOURIST_TAX",
  "OTHER",
]);

export type ExpenseType = z.infer<typeof ExpenseType>;

// Expense Report schema
export const ExpenseReportSchema = z.object({
  id: z.string().cuid().optional(),
  userId: z.string().cuid(),
  title: z.string().min(1, "Title is required").max(100),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2030),
  description: z.string().optional(),
  status: z.enum(["draft", "submitted", "approved"]).default("draft"),
  totalAmount: z.number().default(0),
  lineCount: z.number().int().default(0),
  exportedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ExpenseReport = z.infer<typeof ExpenseReportSchema>;

// Expense Line schema
export const ExpenseLineSchema = z.object({
  id: z.string().cuid().optional(),
  reportId: z.string().cuid(),
  date: z.date(),
  type: ExpenseType,
  description: z.string().min(1, "Description is required").max(200),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3).default("EUR"),
  receiptUrl: z.string().url().optional(),
  ocrProcessed: z.boolean().default(false),
  ocrData: z.string().optional(),
  metadata: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type ExpenseLine = z.infer<typeof ExpenseLineSchema>;

// Form schemas for different expense types
export const BaseExpenseFormSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  type: ExpenseType,
  description: z.string().min(1, "Description is required").max(200),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number",
  }),
  currency: z.string().length(3).default("EUR"),
});

export const FuelExpenseFormSchema = BaseExpenseFormSchema.extend({
  startLocation: z.string().min(1, "Start location is required"),
  endLocation: z.string().min(1, "End location is required"), 
  kilometers: z.string().optional(),
});

export const MealExpenseFormSchema = BaseExpenseFormSchema.extend({
  customer: z.string().optional(),
  colleagues: z.string().optional(),
});

export const HotelExpenseFormSchema = BaseExpenseFormSchema.extend({
  location: z.string().optional(),
  nights: z.string().optional(),
});

// OCR Result schema
export const OCRResultSchema = z.object({
  amount: z.number().optional(),
  date: z.string().optional(),
  type: ExpenseType.optional(),
  vendor: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  rawText: z.string().optional(),
});

export type OCRResult = z.infer<typeof OCRResultSchema>;

// User schema
export const UserSchema = z.object({
  id: z.string().cuid().optional(),
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(100),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type User = z.infer<typeof UserSchema>;

// Suggestion schemas
export const CustomerSuggestionSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, "Customer name is required"),
  usageCount: z.number().int().positive().default(1),
  lastUsed: z.date().optional(),
});

export const ColleagueSuggestionSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, "Colleague name is required"),
  usageCount: z.number().int().positive().default(1),
  lastUsed: z.date().optional(),
});

// API Response schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

// File upload schema
export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB
  allowedTypes: z.array(z.string()).default(["image/jpeg", "image/png", "image/webp"]),
});

// Export settings schema
export const ExportSettingsSchema = z.object({
  includeReceipts: z.boolean().default(true),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  expenseTypes: z.array(ExpenseType).optional(),
  format: z.enum(["xlsx", "csv"]).default("xlsx"),
});

export type ExportSettings = z.infer<typeof ExportSettingsSchema>;

// Environment variables schema
export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_USE_MOCK: z.string().transform((val) => val === "true"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  DATABASE_URL: z.string().optional(),
  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;