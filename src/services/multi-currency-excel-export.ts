/**
 * Multi-Currency Excel Export Service
 * Generates Excel files with 10-column format and currency conversion
 */

import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { ExpenseLine } from '@/types';
import { ExpenseDescriptionFormatter } from './expense-description-formatter';
import { exchangeRateService } from './exchange-rate-service';
import { settingsService } from './settings-service';

interface ExportExpense extends ExpenseLine {
  reportId: string;
}

export class MultiCurrencyExcelExport {
  /**
   * Generate multi-currency Excel file for multiple reports
   */
  static async generateExcel(
    reportIds: string[],
    targetCurrency: string,
    expensesByReport: Record<string, ExpenseLine[]>
  ): Promise<Blob> {
    // Get current exchange rates from settings
    const settings = settingsService.getSettings();
    const rates = settings.exchangeRates.rates;
    const lastUpdated = settings.exchangeRates.lastUpdated;

    // Combine all expenses from all reports
    const allExpenses: ExportExpense[] = [];
    for (const reportId of reportIds) {
      const expenses = expensesByReport[reportId] || [];
      expenses.forEach(expense => {
        allExpenses.push({
          ...expense,
          reportId,
        });
      });
    }

    // Sort expenses by date (ascending)
    allExpenses.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expenses');

    // Define columns (10 columns)
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Expense Type', key: 'expenseType', width: 15 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Company', key: 'company', width: 15 },
      { header: 'Currency of Expense Line', key: 'originalCurrency', width: 20 },
      { header: 'Total of Expense Line', key: 'originalAmount', width: 18 },
      { header: 'Exchange Rate', key: 'exchangeRate', width: 15 },
      { header: 'Selected Currency', key: 'targetCurrency', width: 18 },
      { header: 'Total in Selected Currency', key: 'convertedAmount', width: 25 },
      { header: 'KM', key: 'kilometers', width: 10 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add expense rows
    allExpenses.forEach(expense => {
      // Debug logging
      if (expense.type === 'FUEL') {
        console.log('🔍 FUEL expense metadata:', JSON.stringify(expense.metadata, null, 2));
      }
      if (expense.type === 'LUNCH' || expense.type === 'DINNER' || expense.type === 'BREAKFAST') {
        console.log('🔍 MEAL expense metadata:', JSON.stringify(expense.metadata, null, 2));
      }

      // Format description based on expense type
      const formattedDescription = ExpenseDescriptionFormatter.formatDescription(
        expense.type,
        expense.description,
        expense.metadata
      );

      // Calculate exchange rate
      const expenseCurrency = expense.currency || 'EUR';
      const exchangeRate = this.calculateExchangeRate(
        expenseCurrency,
        targetCurrency,
        rates
      );

      // Convert amount to target currency
      const convertedAmount = exchangeRateService.convertCurrency(
        expense.amount,
        expenseCurrency,
        targetCurrency,
        rates
      );

      // Extract kilometers (only for FUEL expenses)
      const kilometers = ExpenseDescriptionFormatter.extractKilometers(
        expense.type,
        expense.metadata
      );

      // Add row
      worksheet.addRow({
        date: new Date(expense.date).toLocaleDateString('en-US'),
        expenseType: expense.type,
        description: formattedDescription,
        company: 'Expert.AI', // Always hardcoded as per specs
        originalCurrency: expenseCurrency,
        originalAmount: expense.amount,
        exchangeRate: exchangeRate,
        targetCurrency: targetCurrency,
        convertedAmount: convertedAmount,
        kilometers: kilometers || '', // Empty if not fuel
      });
    });

    // Format number columns
    worksheet.getColumn('originalAmount').numFmt = '#,##0.00';
    worksheet.getColumn('exchangeRate').numFmt = '0.0000';
    worksheet.getColumn('convertedAmount').numFmt = '#,##0.00';

    // Add summary row at the bottom
    const lastRow = worksheet.lastRow;
    if (lastRow) {
      const summaryRow = worksheet.addRow({});
      summaryRow.getCell('description').value = 'TOTAL';
      summaryRow.getCell('description').font = { bold: true };

      // Sum converted amounts
      const totalConverted = allExpenses.reduce((sum, expense) => {
        const expenseCurrency = expense.currency || 'EUR';
        const converted = exchangeRateService.convertCurrency(
          expense.amount,
          expenseCurrency,
          targetCurrency,
          rates
        );
        return sum + converted;
      }, 0);

      summaryRow.getCell('convertedAmount').value = totalConverted;
      summaryRow.getCell('convertedAmount').font = { bold: true };
      summaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' },
      };
    }

    // Add exchange rate info comment at the top
    const infoRow = worksheet.insertRow(1, {});
    infoRow.getCell('description').value = lastUpdated
      ? `Exchange rates last updated: ${new Date(lastUpdated).toLocaleString()}`
      : 'Exchange rates: Using default values (not updated from API)';
    infoRow.getCell('description').font = { italic: true, size: 10 };
    infoRow.getCell('description').alignment = { horizontal: 'left' };

    // Merge cells for info row
    worksheet.mergeCells(1, 1, 1, 10);

    // Generate blob
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  /**
   * Calculate exchange rate between two currencies
   * All rates are based on EUR, so we use triangular calculation
   */
  private static calculateExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    rates: Record<string, number>
  ): number {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    // Convert to EUR first, then to target currency
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    // Exchange rate = (1 / fromRate) * toRate
    // This gives us how many units of toCurrency we get for 1 unit of fromCurrency
    const exchangeRate = (toRate / fromRate);

    return Math.round(exchangeRate * 10000) / 10000; // Round to 4 decimal places
  }

  /**
   * Generate ZIP file with Excel and receipts
   */
  static async generateZipWithReceipts(
    reportIds: string[],
    targetCurrency: string,
    expensesByReport: Record<string, ExpenseLine[]>
  ): Promise<Blob> {
    console.log('📦 Generating ZIP with Excel and receipts...');

    // Create ZIP instance
    const zip = new JSZip();

    // Generate Excel file
    const excelBlob = await this.generateExcel(reportIds, targetCurrency, expensesByReport);
    const excelBuffer = await excelBlob.arrayBuffer();

    // Add Excel to ZIP
    const today = new Date().toISOString().split('T')[0];
    const excelFilename = `Expenses_${targetCurrency}_${today}.xlsx`;
    zip.file(excelFilename, excelBuffer);

    // Collect all receipts from all expenses
    const allExpenses: ExportExpense[] = [];
    for (const reportId of reportIds) {
      const expenses = expensesByReport[reportId] || [];
      console.log(`📋 Report ${reportId}: ${expenses.length} expenses`);
      expenses.forEach((expense, index) => {
        console.log(`  Expense ${index + 1}: type=${expense.type}, receiptId=${expense.receiptId || 'NONE'}`);
        allExpenses.push({
          ...expense,
          reportId,
        });
      });
    }

    console.log(`📊 Total expenses collected: ${allExpenses.length}`);

    // Filter expenses that have receipts
    const expensesWithReceipts = allExpenses.filter(expense => expense.receiptId);
    console.log(`📎 Found ${expensesWithReceipts.length} expenses with receipts`);

    if (expensesWithReceipts.length > 0) {
      console.log('Receipt URLs:');
      expensesWithReceipts.forEach((exp, idx) => {
        console.log(`  ${idx + 1}. ${exp.type} - ${exp.receiptId}`);
      });
    }

    // Download and add each receipt to ZIP
    let receiptIndex = 1;
    for (const expense of expensesWithReceipts) {
      if (!expense.receiptId) continue;

      try {
        // Fetch receipt through our proxy API to avoid CORS issues
        const proxyUrl = `/api/receipts/download?url=${encodeURIComponent(expense.receiptId)}`;
        console.log(`📥 Fetching receipt via proxy: ${proxyUrl}`);
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const receiptBlob = await response.blob();
          const receiptBuffer = await receiptBlob.arrayBuffer();

          // Extract file extension from URL or content type
          const contentType = response.headers.get('content-type') || '';
          let extension = 'jpg';
          if (contentType.includes('png')) extension = 'png';
          else if (contentType.includes('pdf')) extension = 'pdf';
          else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';

          // Create meaningful filename: Receipt_01_ExpenseType_Date.ext
          const date = new Date(expense.date).toISOString().split('T')[0];
          const filename = `Receipt_${String(receiptIndex).padStart(2, '0')}_${expense.type}_${date}.${extension}`;

          zip.file(`receipts/${filename}`, receiptBuffer);
          console.log(`✅ Added receipt: ${filename}`);
          receiptIndex++;
        } else {
          console.warn(`⚠️ Failed to fetch receipt: ${expense.receiptId}`);
        }
      } catch (error) {
        console.error(`❌ Error downloading receipt for expense ${expense.id}:`, error);
      }
    }

    // Generate ZIP blob
    console.log('🔄 Generating ZIP file...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    console.log('✅ ZIP file generated successfully');
    return zipBlob;
  }
}
