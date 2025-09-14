import type { ExpenseReport, ExpenseLine, User, OCRResult } from "@/types";
import { generateId, delay } from "@/lib/utils";
import { mockConfig } from "@/lib/env";

export class MockDataGenerator {
  // Sample users
  static users: User[] = [
    {
      id: "user_1",
      email: "fabio.santini@company.com",
      name: "Fabio Santini",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
  ];

  // Sample expense types for variety
  static expenseTypes = [
    "PARKING", "FUEL", "TELEPASS", "LUNCH", "DINNER", 
    "HOTEL", "TRAIN", "BREAKFAST", "TOURIST_TAX", "OTHER"
  ];

  // Sample customers for meals
  static customers = [
    "Acme Corp", "Global Solutions Ltd", "Tech Innovations SPA", 
    "Digital Partners", "Enterprise Systems", "Creative Agency",
    "Consulting Group", "Software House", "Marketing Plus"
  ];

  // Sample colleagues
  static colleagues = [
    "Marco Rossi", "Giulia Bianchi", "Andrea Verdi", "Francesca Neri",
    "Roberto Ferrari", "Elena Russo", "Davide Romano", "Sara Marino",
    "Luca Greco", "Chiara Bruno"
  ];

  // Generate sample expense reports
  static generateExpenseReports(): ExpenseReport[] {
    const reports: ExpenseReport[] = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Generate reports for last 6 months including current
    for (let i = 0; i < 6; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      
      if (month <= 0) {
        month = 12 + month;
        year = year - 1;
      }

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      // We need to calculate totalAmount and lineCount, but we can't call generateExpenseLines here
      // because it would create infinite recursion. Let's add them as default values and calculate later.
      reports.push({
        id: `report_${year}_${month}`,
        userId: "user_1",
        title: `${monthNames[month - 1]} ${year} Expenses`,
        month: month,
        year: year,
        description: `Business expenses for ${monthNames[month - 1]} ${year}`,
        status: i < 2 ? "draft" : i < 4 ? "submitted" : "approved",
        totalAmount: 0, // Will be calculated later
        lineCount: 0, // Will be calculated later
        exportedAt: i === 2 ? new Date(year, month - 1, 28) : undefined, // Some exported
        createdAt: new Date(year, month - 1, 1),
        updatedAt: new Date(year, month - 1, 15),
      });
    }

    return reports;
  }

  // Generate sample expense lines for a report
  static generateExpenseLines(reportId: string): ExpenseLine[] {
    const lines: ExpenseLine[] = [];
    
    // Extract year and month from reportId (format: report_2024_12)
    const parts = reportId.split('_');
    if (parts.length !== 3) return [];
    
    const year = parseInt(parts[1]);
    const month = parseInt(parts[2]);

    // Generate 8-15 expense lines per report
    const numLines = Math.floor(Math.random() * 8) + 8;

    for (let i = 0; i < numLines; i++) {
      const type = this.expenseTypes[Math.floor(Math.random() * this.expenseTypes.length)];
      const day = Math.floor(Math.random() * 28) + 1;
      const date = new Date(year, month - 1, day);

      let description = "";
      let amount = 0;
      let metadata = "";

      // Generate realistic data based on expense type
      switch (type) {
        case "PARKING":
          description = `Parking ${this.getRandomLocation()}`;
          amount = Math.round((Math.random() * 20 + 5) * 100) / 100; // 5-25€
          break;
        case "FUEL":
          description = `Fuel ${this.getRandomLocation()}`;
          amount = Math.round((Math.random() * 80 + 30) * 100) / 100; // 30-110€
          metadata = JSON.stringify({
            startLocation: this.getRandomLocation(),
            endLocation: this.getRandomLocation(),
            kilometers: Math.floor(Math.random() * 300 + 50)
          });
          break;
        case "LUNCH":
        case "DINNER":
        case "BREAKFAST":
          const customer = this.customers[Math.floor(Math.random() * this.customers.length)];
          const colleague = Math.random() > 0.5 ? this.colleagues[Math.floor(Math.random() * this.colleagues.length)] : "";
          description = `Business ${type.toLowerCase()} - ${customer}`;
          amount = Math.round((Math.random() * 60 + 15) * 100) / 100; // 15-75€
          metadata = JSON.stringify({
            customer: customer,
            colleagues: colleague
          });
          break;
        case "HOTEL":
          description = `Hotel ${this.getRandomLocation()}`;
          amount = Math.round((Math.random() * 200 + 80) * 100) / 100; // 80-280€
          metadata = JSON.stringify({
            location: this.getRandomLocation(),
            nights: Math.floor(Math.random() * 3) + 1
          });
          break;
        case "TRAIN":
          description = `Train ${this.getRandomLocation()} - ${this.getRandomLocation()}`;
          amount = Math.round((Math.random() * 100 + 20) * 100) / 100; // 20-120€
          break;
        case "TELEPASS":
          description = `Highway toll ${this.getRandomLocation()}`;
          amount = Math.round((Math.random() * 15 + 2) * 100) / 100; // 2-17€
          break;
        case "TOURIST_TAX":
          description = `Tourist tax ${this.getRandomLocation()}`;
          amount = Math.round((Math.random() * 10 + 1) * 100) / 100; // 1-11€
          break;
        default:
          description = `Other expense`;
          amount = Math.round((Math.random() * 50 + 10) * 100) / 100; // 10-60€
      }

      lines.push({
        id: `line_${reportId}_${i + 1}`,
        reportId: reportId,
        date: date,
        type: type as any,
        description: description,
        amount: amount,
        currency: "EUR",
        receiptUrl: Math.random() > 0.3 ? `blob:mock-receipt-${generateId()}` : undefined,
        ocrProcessed: Math.random() > 0.6,
        ocrData: undefined,
        metadata: metadata || undefined,
        createdAt: date,
        updatedAt: date,
      });
    }

    return lines.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // Sample locations for realistic expense data
  private static locations = [
    "Milano", "Roma", "Torino", "Napoli", "Bologna", "Firenze", 
    "Venezia", "Genova", "Palermo", "Bari", "Verona", "Padova"
  ];

  private static getRandomLocation(): string {
    return this.locations[Math.floor(Math.random() * this.locations.length)];
  }

  // Generate mock OCR results based on receipt type
  static generateOCRResult(mockReceiptType?: string): OCRResult {
    const types = ["LUNCH", "PARKING", "FUEL", "HOTEL", "OTHER"];
    const type = mockReceiptType || types[Math.floor(Math.random() * types.length)];
    
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 30)); // Last 30 days

    let amount: number;
    let vendor: string;

    switch (type) {
      case "LUNCH":
        amount = Math.round((Math.random() * 50 + 15) * 100) / 100;
        vendor = "Ristorante " + ["La Tavola", "Il Posto", "Da Mario", "Osteria"][Math.floor(Math.random() * 4)];
        break;
      case "PARKING":
        amount = Math.round((Math.random() * 15 + 3) * 100) / 100;
        vendor = "Parking " + this.getRandomLocation();
        break;
      case "FUEL":
        amount = Math.round((Math.random() * 80 + 40) * 100) / 100;
        vendor = ["ENI", "Agip", "Shell", "Q8"][Math.floor(Math.random() * 4)] + " " + this.getRandomLocation();
        break;
      case "HOTEL":
        amount = Math.round((Math.random() * 150 + 80) * 100) / 100;
        vendor = "Hotel " + ["Centrale", "Europa", "Plaza", "Royal"][Math.floor(Math.random() * 4)];
        break;
      default:
        amount = Math.round((Math.random() * 40 + 10) * 100) / 100;
        vendor = "Generic Vendor";
    }

    return {
      amount: amount,
      date: baseDate.toISOString().split('T')[0],
      type: type as any,
      vendor: vendor,
      confidence: Math.round((Math.random() * 0.3 + 0.7) * 100) / 100, // 0.7-1.0
      rawText: `Mock OCR text for ${vendor} - €${amount}`,
    };
  }
}