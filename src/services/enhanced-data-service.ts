import type {
  ExpenseReport,
  ExpenseLine,
  ExpenseLineStorage,
  User,
  OCRResult,
  ExportSettings,
  ExpenseType,
  ExpenseMetadata,
  ExpenseLineStorageSchema
} from "@/types";
import type {
  IDataService,
  IStorageAdapter,
  IFileStorage,
  CreateExpenseReportInput,
  CreateExpenseLineInput
} from "./data-service";
import { generateId, delay } from "@/lib/utils";

interface DataServiceConfig {
  storageAdapter: IStorageAdapter;
  fileStorage: IFileStorage;
  delayMs?: number;
}

/**
 * Enhanced Data Service with robust storage and typed metadata
 * Uses dependency injection for flexible storage backends
 */
export class EnhancedDataService implements IDataService {
  private config: DataServiceConfig;

  constructor(config: DataServiceConfig) {
    this.config = {
      delayMs: 100, // Default delay for dev simulation
      ...config
    };
  }

  // Helper method to simulate async delays
  private async delay(): Promise<void> {
    if (this.config.delayMs) {
      await delay(this.config.delayMs);
    }
  }

  // Helper to convert storage format to runtime format
  private storageToRuntime(stored: ExpenseLineStorage): ExpenseLine {
    return {
      ...stored,
      date: new Date(stored.date),
      createdAt: stored.createdAt ? new Date(stored.createdAt) : undefined,
      updatedAt: stored.updatedAt ? new Date(stored.updatedAt) : undefined
    };
  }

  // Helper to convert runtime format to storage format
  private runtimeToStorage(expense: ExpenseLine): ExpenseLineStorage {
    return {
      ...expense,
      id: expense.id || generateId(),
      date: expense.date.toISOString(),
      createdAt: expense.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: expense.updatedAt?.toISOString() || new Date().toISOString()
    };
  }

  // Helper to process metadata based on expense type
  private async processMetadata(type: ExpenseType, rawMetadata?: any): Promise<ExpenseMetadata | undefined> {
    if (!rawMetadata) return undefined;

    try {
      switch (type) {
        case 'FUEL':
          if (rawMetadata.startLocation && rawMetadata.endLocation) {
            // TODO: In future, integrate with Google Maps for distance calculation
            const metadata: ExpenseMetadata = {
              type: 'FUEL',
              data: {
                startLocation: rawMetadata.startLocation,
                endLocation: rawMetadata.endLocation,
                distance: rawMetadata.distance || undefined,
                route: rawMetadata.route,
                vehicleType: rawMetadata.vehicleType,
                liters: rawMetadata.liters
              }
            };
            return metadata;
          }
          break;

        case 'LUNCH':
        case 'DINNER':
        case 'BREAKFAST':
          const mealMetadata: ExpenseMetadata = {
            type,
            data: {
              customer: rawMetadata.customer,
              colleagues: Array.isArray(rawMetadata.colleagues)
                ? rawMetadata.colleagues
                : rawMetadata.colleagues ? [rawMetadata.colleagues] : undefined,
              attendees: rawMetadata.attendees,
              businessPurpose: rawMetadata.businessPurpose,
              location: rawMetadata.location
            }
          };
          return mealMetadata;

        case 'HOTEL':
          const hotelMetadata: ExpenseMetadata = {
            type: 'HOTEL',
            data: {
              location: rawMetadata.location,
              nights: rawMetadata.nights || 1,
              room: rawMetadata.room,
              bookingRef: rawMetadata.bookingRef,
              checkIn: rawMetadata.checkIn,
              checkOut: rawMetadata.checkOut
            }
          };
          return hotelMetadata;

        case 'PARKING':
          const parkingMetadata: ExpenseMetadata = {
            type: 'PARKING',
            data: {
              location: rawMetadata.location,
              duration: rawMetadata.duration,
              zone: rawMetadata.zone,
              hourlyRate: rawMetadata.hourlyRate
            }
          };
          return parkingMetadata;

        case 'TRAIN':
        case 'TELEPASS':
          const transportMetadata: ExpenseMetadata = {
            type,
            data: {
              route: rawMetadata.route,
              class: rawMetadata.class,
              departure: rawMetadata.departure,
              arrival: rawMetadata.arrival,
              ticketRef: rawMetadata.ticketRef
            }
          };
          return transportMetadata;

        case 'TOURIST_TAX':
        case 'OTHER':
          return {
            type,
            data: rawMetadata
          };
      }
    } catch (error) {
      console.error('Error processing metadata:', error);
      return undefined;
    }

    return undefined;
  }

  // ===== USER MANAGEMENT =====
  async getCurrentUser(): Promise<User> {
    await this.delay();

    // TODO: Get from auth context when available
    return {
      id: 'user_1',
      email: 'user@company.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // ===== EXPENSE REPORTS =====
  async getExpenseReports(): Promise<ExpenseReport[]> {
    await this.delay();

    try {
      const reportKeys = await this.config.storageAdapter.list('report:');
      const reports: ExpenseReport[] = [];

      for (const key of reportKeys) {
        const report = await this.config.storageAdapter.load<ExpenseReport>(key);
        if (report) {
          // Convert date strings back to Date objects if needed
          reports.push({
            ...report,
            createdAt: report.createdAt ? new Date(report.createdAt) : new Date(),
            updatedAt: report.updatedAt ? new Date(report.updatedAt) : new Date(),
            exportedAt: report.exportedAt ? new Date(report.exportedAt) : undefined
          });
        }
      }

      // Sort by updatedAt desc
      return reports.sort((a, b) =>
        (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
      );
    } catch (error) {
      console.error('Failed to get expense reports:', error);
      return [];
    }
  }

  async getExpenseReport(id: string): Promise<ExpenseReport> {
    await this.delay();

    const report = await this.config.storageAdapter.load<ExpenseReport>(`report:${id}`);
    if (!report) {
      throw new Error(`Expense report with id ${id} not found`);
    }

    return {
      ...report,
      createdAt: report.createdAt ? new Date(report.createdAt) : new Date(),
      updatedAt: report.updatedAt ? new Date(report.updatedAt) : new Date(),
      exportedAt: report.exportedAt ? new Date(report.exportedAt) : undefined
    };
  }

  async createExpenseReport(data: CreateExpenseReportInput): Promise<ExpenseReport> {
    await this.delay();

    const newReport: ExpenseReport = {
      id: generateId(),
      userId: "user_1", // TODO: Get from auth context
      title: data.title,
      month: data.month,
      year: data.year,
      description: data.description,
      status: "draft",
      totalAmount: 0,
      lineCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.config.storageAdapter.save(`report:${newReport.id}`, newReport);
    return newReport;
  }

  async updateExpenseReport(id: string, data: Partial<ExpenseReport>): Promise<ExpenseReport> {
    await this.delay();

    const existing = await this.getExpenseReport(id);
    const updated: ExpenseReport = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    await this.config.storageAdapter.save(`report:${id}`, updated);
    return updated;
  }

  async deleteExpenseReport(id: string): Promise<void> {
    await this.delay();

    // Remove the report
    await this.config.storageAdapter.remove(`report:${id}`);

    // Remove all associated expense lines
    const expenseKeys = await this.config.storageAdapter.list('expense:');
    for (const key of expenseKeys) {
      const expense = await this.config.storageAdapter.load<ExpenseLineStorage>(key);
      if (expense && expense.reportId === id) {
        await this.config.storageAdapter.remove(key);

        // Also remove associated receipt file
        if (expense.receiptId) {
          try {
            await this.config.fileStorage.remove(expense.receiptId);
          } catch (error) {
            console.error(`Failed to remove receipt ${expense.receiptId}:`, error);
          }
        }
      }
    }
  }

  // ===== EXPENSE LINES =====
  async getExpenseLines(reportId: string): Promise<ExpenseLine[]> {
    await this.delay();

    try {
      const expenseKeys = await this.config.storageAdapter.list('expense:');
      const expenses: ExpenseLine[] = [];

      for (const key of expenseKeys) {
        const stored = await this.config.storageAdapter.load<ExpenseLineStorage>(key);
        if (stored && stored.reportId === reportId) {
          expenses.push(this.storageToRuntime(stored));
        }
      }

      // Sort by date desc
      return expenses.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      console.error('Failed to get expense lines:', error);
      return [];
    }
  }

  async addExpenseLine(reportId: string, line: CreateExpenseLineInput): Promise<ExpenseLine> {
    await this.delay();

    // Verify report exists
    await this.getExpenseReport(reportId);

    // Process metadata based on expense type
    const metadata = await this.processMetadata(line.type, line.metadata);

    const newLine: ExpenseLine = {
      id: generateId(),
      reportId,
      date: line.date,
      type: line.type,
      description: line.description,
      amount: line.amount,
      currency: line.currency || "EUR",
      receiptId: line.receiptId,
      ocrProcessed: false,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store the expense line
    const stored = this.runtimeToStorage(newLine);
    await this.config.storageAdapter.save(`expense:${newLine.id}`, stored);

    // Update report totals
    await this.updateReportTotals(reportId);

    return newLine;
  }

  async updateExpenseLine(id: string, data: Partial<ExpenseLine>): Promise<ExpenseLine> {
    await this.delay();

    const stored = await this.config.storageAdapter.load<ExpenseLineStorage>(`expense:${id}`);
    if (!stored) {
      throw new Error(`Expense line with id ${id} not found`);
    }

    const existing = this.storageToRuntime(stored);

    // Process metadata if type changed
    let metadata = data.metadata !== undefined ? data.metadata : existing.metadata;
    if (data.type && data.type !== existing.type && data.metadata) {
      metadata = await this.processMetadata(data.type, data.metadata);
    }

    const updated: ExpenseLine = {
      ...existing,
      ...data,
      id, // Ensure ID doesn't change
      metadata,
      updatedAt: new Date()
    };

    const updatedStored = this.runtimeToStorage(updated);
    await this.config.storageAdapter.save(`expense:${id}`, updatedStored);

    // Update report totals
    await this.updateReportTotals(updated.reportId);

    return updated;
  }

  async deleteExpenseLine(id: string): Promise<void> {
    await this.delay();

    const stored = await this.config.storageAdapter.load<ExpenseLineStorage>(`expense:${id}`);
    if (!stored) {
      throw new Error(`Expense line with id ${id} not found`);
    }

    const reportId = stored.reportId;

    // Remove receipt file if exists
    if (stored.receiptId) {
      try {
        await this.config.fileStorage.remove(stored.receiptId);
      } catch (error) {
        console.error(`Failed to remove receipt ${stored.receiptId}:`, error);
      }
    }

    // Remove expense line
    await this.config.storageAdapter.remove(`expense:${id}`);

    // Update report totals
    await this.updateReportTotals(reportId);
  }

  // Helper to update report totals
  private async updateReportTotals(reportId: string): Promise<void> {
    try {
      const expenses = await this.getExpenseLines(reportId);
      const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
      const lineCount = expenses.length;

      await this.updateExpenseReport(reportId, {
        totalAmount,
        lineCount
      });
    } catch (error) {
      console.error('Failed to update report totals:', error);
    }
  }

  // ===== FILE OPERATIONS =====
  async uploadReceipt(file: File): Promise<string> {
    await this.delay();
    return this.config.fileStorage.store(file);
  }

  async getReceiptUrl(receiptId: string): Promise<string> {
    await this.delay();
    return this.config.fileStorage.getUrl(receiptId);
  }

  async downloadReceipt(receiptId: string): Promise<Blob> {
    await this.delay();

    const file = await this.config.fileStorage.retrieve(receiptId);
    if (!file) {
      throw new Error(`Receipt with id ${receiptId} not found`);
    }

    return file;
  }

  async removeReceipt(receiptId: string): Promise<void> {
    await this.delay();
    await this.config.fileStorage.remove(receiptId);
  }

  // ===== OCR OPERATIONS =====
  async processReceiptOCR(receiptId: string): Promise<OCRResult> {
    await this.delay();

    // TODO: Implement OCR processing in Phase B
    // For now, return mock result
    return {
      amount: Math.round((Math.random() * 100 + 10) * 100) / 100,
      date: new Date().toISOString().split('T')[0],
      type: 'OTHER',
      vendor: 'Mock Vendor',
      confidence: 0.85,
      rawText: 'Mock OCR result - to be implemented in Phase B'
    };
  }

  // ===== SUGGESTIONS =====
  async getCustomerSuggestions(query?: string): Promise<string[]> {
    await this.delay();

    // TODO: Implement customer suggestions based on usage
    const mockCustomers = [
      'ABC Corp', 'XYZ Ltd', 'Tech Solutions Inc', 'Global Services', 'Innovation Hub'
    ];

    if (!query) return mockCustomers.slice(0, 5);

    return mockCustomers
      .filter(c => c.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }

  async getColleagueSuggestions(query?: string): Promise<string[]> {
    await this.delay();

    // TODO: Implement colleague suggestions based on usage
    const mockColleagues = [
      'Mario Rossi', 'Anna Bianchi', 'Giuseppe Verdi', 'Francesca Neri', 'Luca Conti'
    ];

    if (!query) return mockColleagues.slice(0, 5);

    return mockColleagues
      .filter(c => c.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }

  async updateCustomerUsage(name: string): Promise<void> {
    await this.delay();
    // TODO: Implement usage tracking
    console.log('Customer usage updated:', name);
  }

  async updateColleagueUsage(name: string): Promise<void> {
    await this.delay();
    // TODO: Implement usage tracking
    console.log('Colleague usage updated:', name);
  }

  // ===== EXPORT OPERATIONS =====
  async exportToExcel(reportId: string, settings?: ExportSettings): Promise<Blob> {
    await this.delay();

    const report = await this.getExpenseReport(reportId);
    const expenses = await this.getExpenseLines(reportId);

    // Generate CSV for now (Excel generation to be implemented)
    let csvContent = "Date,Type,Description,Amount,Currency,Customer,Colleagues,Receipt\n";

    expenses.forEach(expense => {
      const customer = expense.metadata?.type === 'LUNCH' || expense.metadata?.type === 'DINNER' || expense.metadata?.type === 'BREAKFAST'
        ? expense.metadata.data.customer || ""
        : "";

      const colleagues = expense.metadata?.type === 'LUNCH' || expense.metadata?.type === 'DINNER' || expense.metadata?.type === 'BREAKFAST'
        ? (expense.metadata.data.colleagues || []).join('; ')
        : "";

      const hasReceipt = expense.receiptId ? "Yes" : "No";

      csvContent += `${expense.date.toLocaleDateString()},${expense.type},${expense.description},${expense.amount},${expense.currency},${customer},${colleagues},${hasReceipt}\n`;
    });

    return new Blob([csvContent], { type: 'text/csv' });
  }

  async exportToExcelWithReceipts(reportId: string, settings?: ExportSettings): Promise<Blob> {
    await this.delay();

    // TODO: Implement ZIP with Excel + receipts
    const excel = await this.exportToExcel(reportId, settings);
    return excel; // For now, return just Excel
  }

  // ===== SYSTEM OPERATIONS =====
  async clearAllData(): Promise<void> {
    await this.delay();
    await this.config.storageAdapter.clear();
  }

  async getStorageInfo(): Promise<{ used: number; available: number }> {
    await this.delay();
    return this.config.storageAdapter.getStorageInfo?.() || { used: 0, available: 0 };
  }
}