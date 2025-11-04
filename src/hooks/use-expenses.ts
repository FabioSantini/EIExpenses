"use client";

import { useState, useEffect } from "react";
import { useDataService } from "@/services/data-service-provider";
import type { ExpenseReport, ExpenseLine } from "@/types";

/**
 * Hook for managing expense reports
 */
export function useExpenseReports() {
  const dataService = useDataService();
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dataService) {
      loadReports();
    }
  }, [dataService]);

  const loadReports = async () => {
    if (!dataService) {
      setIsLoading(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await dataService.getExpenseReports();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expense reports");
    } finally {
      setIsLoading(false);
    }
  };

  const createReport = async (data: {
    title: string;
    month: number;
    year: number;
    description?: string;
  }) => {
    if (!dataService) {
      throw new Error("Data service not available");
    }

    try {
      const newReport = await dataService.createExpenseReport(data);
      setReports(prev => [newReport, ...prev]);
      return newReport;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense report");
      throw err;
    }
  };

  const updateReport = async (id: string, data: Partial<ExpenseReport>) => {
    if (!dataService) {
      throw new Error("Data service not available");
    }

    try {
      const updatedReport = await dataService.updateExpenseReport(id, data);
      setReports(prev => prev.map(r => r.id === id ? updatedReport : r));
      return updatedReport;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update expense report");
      throw err;
    }
  };

  const deleteReport = async (id: string) => {
    if (!dataService) {
      throw new Error("Data service not available");
    }

    try {
      await dataService.deleteExpenseReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete expense report");
      throw err;
    }
  };

  return {
    reports,
    isLoading,
    error,
    loadReports,
    mutate: loadReports, // Alias for compatibility with SWR-like patterns
    createReport,
    updateReport,
    deleteReport,
  };
}

/**
 * Hook for managing expense lines within a report
 */
export function useExpenseLines(reportId: string) {
  const dataService = useDataService();
  const [expenses, setExpenses] = useState<ExpenseLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reportId && dataService) {
      loadExpenses();
    }
  }, [reportId, dataService]);

  const loadExpenses = async () => {
    if (!reportId) {
      setIsLoading(false);
      return;
    }

    if (!dataService) {
      setIsLoading(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log(`🔷 useExpenseLines: Loading expenses for report ${reportId}`);
      console.log(`🔷 useExpenseLines: Using data service:`, dataService.constructor.name);
      const data = await dataService.getExpenseLines(reportId);
      console.log(`🔷 useExpenseLines: Loaded ${data.length} expenses`);
      setExpenses(data);
    } catch (err) {
      console.error(`❌ useExpenseLines: Error loading expenses:`, err);
      setError(err instanceof Error ? err.message : "Failed to load expense lines");
    } finally {
      setIsLoading(false);
    }
  };

  const addExpense = async (data: {
    date: Date;
    type: string;
    description: string;
    amount: number;
    currency?: string;
    receiptId?: string;
    metadata?: string;
  }) => {
    if (!dataService) {
      throw new Error("Data service not available");
    }

    try {
      const newExpense = await dataService.addExpenseLine(reportId, data);
      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense line");
      throw err;
    }
  };

  const addMultipleExpenses = async (expensesData: Array<{
    date: Date;
    type: string;
    description: string;
    amount: number;
    currency?: string;
    receiptId?: string;
    metadata?: string;
  }>) => {
    try {
      if (!dataService) {
        throw new Error("Data service not available");
      }

      // Process expenses one by one for now (can be optimized to batch API call later)
      const newExpenses = [];
      for (const expenseData of expensesData) {
        const newExpense = await dataService.addExpenseLine(reportId, expenseData);
        newExpenses.push(newExpense);
      }
      
      setExpenses(prev => [...newExpenses, ...prev]);
      return newExpenses;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense lines");
      throw err;
    }
  };

  const updateExpense = async (id: string, data: Partial<ExpenseLine>) => {
    if (!dataService) {
      throw new Error("Data service not available");
    }

    try {
      const updatedExpense = await dataService.updateExpenseLine(id, data);
      setExpenses(prev => prev.map(e => e.id === id ? updatedExpense : e));
      return updatedExpense;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update expense line");
      throw err;
    }
  };

  const deleteExpense = async (id: string) => {
    if (!dataService) {
      throw new Error("Data service not available");
    }

    try {
      await dataService.deleteExpenseLine(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete expense line");
      throw err;
    }
  };

  // Calculate totals
  const summary = {
    totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    count: expenses.length,
    withReceipts: expenses.filter(e => e.receiptId).length,
    byType: expenses.reduce((acc, expense) => {
      acc[expense.type] = (acc[expense.type] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>),
  };

  return {
    expenses,
    summary,
    isLoading,
    error,
    loadExpenses,
    addExpense,
    addMultipleExpenses,
    updateExpense,
    deleteExpense,
  };
}

/**
 * Hook for file upload operations
 */
export function useFileUpload() {
  const dataService = useDataService();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadReceipt = async (file: File, reportId?: string) => {
    if (!dataService) {
      throw new Error("Data service not available");
    }

    try {
      setIsUploading(true);
      setError(null);
      const url = await dataService.uploadReceipt(file, reportId);
      return url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload receipt");
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const processWithOCR = async (receiptId: string) => {
    if (!dataService) {
      throw new Error("Data service not available");
    }

    try {
      setError(null);
      const ocrResult = await dataService.processReceiptOCR(receiptId);
      return ocrResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process receipt with OCR");
      throw err;
    }
  };

  return {
    uploadReceipt,
    processWithOCR,
    isUploading,
    error,
  };
}

/**
 * Hook for autocomplete suggestions
 */
export function useSuggestions() {
  const dataService = useDataService();

  const getCustomerSuggestions = async (query?: string) => {
    if (!dataService) {
      return [];
    }

    try {
      return await dataService.getCustomerSuggestions(query);
    } catch (err) {
      console.error("Failed to get customer suggestions:", err);
      return [];
    }
  };

  const getColleagueSuggestions = async (query?: string) => {
    if (!dataService) {
      return [];
    }

    try {
      return await dataService.getColleagueSuggestions(query);
    } catch (err) {
      console.error("Failed to get colleague suggestions:", err);
      return [];
    }
  };

  const updateCustomerUsage = async (name: string) => {
    if (!dataService) {
      return;
    }

    try {
      await dataService.updateCustomerUsage(name);
    } catch (err) {
      console.error("Failed to update customer usage:", err);
    }
  };

  const updateColleagueUsage = async (name: string) => {
    if (!dataService) {
      return;
    }

    try {
      await dataService.updateColleagueUsage(name);
    } catch (err) {
      console.error("Failed to update colleague usage:", err);
    }
  };

  return {
    getCustomerSuggestions,
    getColleagueSuggestions,
    updateCustomerUsage,
    updateColleagueUsage,
  };
}

/**
 * Hook for export operations
 */
export function useExport() {
  const dataService = useDataService();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToExcel = async (
    reportIds: string | string[],
    targetCurrency: string = "EUR",
    settings?: any
  ) => {
    if (!dataService) {
      throw new Error("Data service not available");
    }

    try {
      setIsExporting(true);
      setError(null);

      // Convert single reportId to array for consistency
      const reportIdsArray = Array.isArray(reportIds) ? reportIds : [reportIds];

      const blob = await dataService.exportToExcel(reportIdsArray, targetCurrency, settings);

      // Generate filename with currency and date
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const includeReceipts = settings?.includeReceipts || false;
      const extension = includeReceipts ? 'zip' : 'xlsx';
      const filename = `Expenses_${targetCurrency}_${today}.${extension}`;

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return blob;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export to Excel");
      throw err;
    } finally {
      setIsExporting(false);
    }
  };

  const exportWithReceipts = async (reportId: string, settings?: any) => {
    if (!dataService) {
      throw new Error("Data service not available");
    }

    try {
      setIsExporting(true);
      setError(null);
      const blob = await dataService.exportToExcelWithReceipts(reportId, settings);
      
      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-with-receipts-${reportId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return blob;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export with receipts");
      throw err;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToExcel,
    exportWithReceipts,
    isExporting,
    error,
  };
}