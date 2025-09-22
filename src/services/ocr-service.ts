import { env } from "@/lib/env";
import type { ExpenseType, OCRResult } from "@/lib/validations";
import type { AppConfig } from "@/app/api/config/route";

export interface ReceiptOCRResult {
  success: boolean;
  data?: {
    type?: ExpenseType;
    amount?: number;
    date?: string;
    vendor?: string;
    description?: string;
    location?: string;
    confidence?: number;
    rawText?: string;
  };
  error?: string;
}

class OCRService {
  private apiKey: string | null = null;
  private configPromise: Promise<AppConfig> | null = null;

  constructor() {
    this.apiKey = env.OPENAI_API_KEY || null;
    console.log("🔑 OCRService initialized with API key:", this.apiKey ? "✅ Available" : "❌ Not available");
    // Note: No longer logging env.NEXT_PUBLIC_USE_MOCK - will use server config instead
  }

  /**
   * Fetch configuration from server API endpoint
   */
  private async fetchConfig(): Promise<AppConfig> {
    try {
      console.log('⚙️ OCRService: Fetching configuration from server');

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/config`);

      if (!response.ok) {
        throw new Error(`Config API error: ${response.status} ${response.statusText}`);
      }

      const config: AppConfig = await response.json();
      console.log('✅ OCRService: Configuration received - environment:', config.dataService.environment);

      return config;
    } catch (error) {
      console.error('❌ OCRService: Failed to fetch config, using fallback:', error);

      // Fallback configuration
      return {
        dataService: { environment: 'mock', available: ['mock'] },
        features: { ocr: true, googleMaps: false, excelExport: false, pwa: false, offline: false },
        app: { name: 'EI-Expenses', version: '0.1.0', debug: false },
        api: { baseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001' }
      };
    }
  }

  /**
   * Get configuration (cached)
   */
  private async getConfig(): Promise<AppConfig> {
    if (!this.configPromise) {
      this.configPromise = this.fetchConfig();
    }
    return this.configPromise;
  }

  /**
   * Process receipt image using our server-side API endpoint
   */
  async processReceipt(imageFile: File): Promise<ReceiptOCRResult> {
    try {
      console.log("🔍 Processing receipt via server-side API...");

      // Create FormData to send the image
      const formData = new FormData();
      formData.append('image', imageFile);

      // Call our server-side API endpoint
      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      console.log("✅ Receipt processed successfully via server:", result.data);

      return result;

    } catch (error) {
      console.error("❌ Receipt processing failed:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred during receipt processing"
      };
    }
  }

  /**
   * Mock OCR processing for development when API is not available
   */
  async processReceiptMock(imageFile: File): Promise<ReceiptOCRResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create realistic mock data that matches your test receipt (Moxy Hotels)
    const mockData = {
      type: "LUNCH" as ExpenseType, // 13:45 = lunch time
      amount: 77.10, // From your receipt
      date: "2025-09-11", // 11 September 2025 from your receipt
      vendor: "Moxy Hotels",
      description: "Lunch at Moxy Hotels",
      location: "Milano, Italy",
      confidence: 0.92,
      rawText: `MOXY HOTELS
Milano Centro
Via Giuseppe Mazzini, 4
20123 Milano MI

Data: 11/09/2025
Ora: 13:45

PRANZO
1x Menu Business         €77.10

TOTALE                   €77.10

IVA inclusa
Grazie per la sua visita!`
    };

    console.log("🎭 Mock OCR returning realistic data for Moxy Hotels receipt");

    return {
      success: true,
      data: mockData
    };
  }

  /**
   * Process receipt with fallback to mock ONLY when server config indicates mock mode
   */
  async processReceiptWithFallback(imageFile: File): Promise<ReceiptOCRResult> {
    console.log("🔍 processReceiptWithFallback called");

    try {
      // Get configuration from server
      const config = await this.getConfig();
      const useMockMode = config.dataService.environment === 'mock';

      console.log("🎭 Server config - Mock mode enabled:", useMockMode);

      // If server config indicates mock mode, use mock directly
      if (useMockMode) {
        console.log("🎭 Server configured for mock mode - using mock OCR processing");
        return this.processReceiptMock(imageFile);
      }

      // Otherwise, try real API (no fallback to mock when Azure is configured)
      console.log("📡 Server configured for Azure mode: Trying real OpenAI GPT-4 Vision API");
      const result = await this.processReceipt(imageFile);

      if (result.success) {
        console.log("✅ Real OCR successful in Azure mode");
        return result;
      } else {
        console.error("❌ Real API failed in Azure mode - NOT falling back to mock");
        return {
          success: false,
          error: result.error || "OCR processing failed. Please ensure OpenAI API key is configured."
        };
      }
    } catch (configError) {
      console.error("❌ Failed to get server config, trying real API:", configError);

      // If config fetch fails, try real API as fallback
      try {
        const result = await this.processReceipt(imageFile);
        if (result.success) {
          return result;
        }
      } catch (ocrError) {
        console.error("❌ Both config fetch and OCR failed:", ocrError);
      }

      return {
        success: false,
        error: "OCR processing failed. Please ensure OpenAI API key is configured."
      };
    }
  }

  /**
   * Convert file to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (data:image/jpeg;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get the prompt for GPT-4 Vision to extract receipt data
   */
  private getExtractionPrompt(): string {
    return `Analyze this Italian receipt/scontrino image and extract the following information. Return ONLY a valid JSON object with these exact fields:

{
  "type": "expense_type",
  "amount": number,
  "date": "YYYY-MM-DD",
  "vendor": "vendor_name",
  "description": "brief_description",
  "location": "city_or_address",
  "confidence": number_between_0_and_1,
  "rawText": "visible_text_from_receipt"
}

EXPENSE TYPE RULES:
- LUNCH: if time is between 11:00-15:00 OR contains words like "pranzo", "lunch", "ristorante", "trattoria", "pizzeria"
- DINNER: if time is between 18:00-23:00 OR contains "cena", "dinner"
- BREAKFAST: if time is between 06:00-11:00 OR contains "colazione", "breakfast", "bar" (morning)
- HOTEL: if contains "hotel", "albergo", "soggiorno", "pernottamento"
- FUEL: if contains "carburante", "benzina", "gasolio", "fuel", "esso", "eni", "agip"
- PARKING: if contains "parcheggio", "sosta", "parking"
- TRAIN: if contains "trenitalia", "italo", "biglietto", "treno"
- OTHER: if none of the above apply

EXTRACTION RULES:
- Amount: Look for "TOTALE", "TOTAL", "TOT", "€" - extract the final total amount (not subtotals)
- Date: Look for dates in format DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY - convert to YYYY-MM-DD
- Vendor: Extract business name (usually at top of receipt) - NOT the description
- Description: Create meaningful description like "Lunch at [vendor_name]" or "[vendor_name] - [expense_type]"
- Location: Extract city/address if visible
- Time: Use time to help determine expense type
- rawText: Include ALL visible text exactly as written

ITALIAN CONTEXT:
- Receipts may show time in 24h format (13:45 = 1:45 PM = LUNCH time)
- Currency is € (Euro)
- Dates are typically DD/MM/YYYY format
- Common words: "SCONTRINO", "RICEVUTA", "FATTURA", "DATA", "ORA", "TOTALE"

Be precise with amounts - look carefully for the correct total (not subtotals or taxes).
Return valid JSON only, no additional text.`;
  }

  /**
   * Parse GPT-4 response and validate the extracted data
   */
  private parseGPTResponse(content: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in GPT response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and clean the response
      const vendor = typeof parsed.vendor === 'string' ? parsed.vendor.trim() : null;
      const type = this.validateExpenseType(parsed.type);

      // Create a better description if one wasn't provided or seems generic
      let description = typeof parsed.description === 'string' ? parsed.description.trim() : null;
      if (!description || description.toLowerCase().includes('other expenses from receipt')) {
        if (vendor && type) {
          const typeText = type.toLowerCase().replace('_', ' ');
          description = `${typeText.charAt(0).toUpperCase() + typeText.slice(1)} at ${vendor}`;
        } else if (vendor) {
          description = vendor;
        } else if (type) {
          description = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase().replace('_', ' ');
        }
      }

      return {
        type: type,
        amount: typeof parsed.amount === 'number' ? parsed.amount : null,
        date: this.validateDate(parsed.date),
        vendor: vendor,
        description: description,
        location: typeof parsed.location === 'string' ? parsed.location.trim() : null,
        confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
        rawText: typeof parsed.rawText === 'string' ? parsed.rawText.trim() : null,
      };
    } catch (error) {
      console.error("Failed to parse GPT response:", error);
      throw new Error("Failed to parse receipt data from GPT response");
    }
  }

  /**
   * Validate expense type
   */
  private validateExpenseType(type: any): ExpenseType | null {
    const validTypes: ExpenseType[] = [
      "PARKING", "FUEL", "TELEPASS", "LUNCH", "DINNER", "HOTEL",
      "TRAIN", "BREAKFAST", "TOURIST_TAX", "OTHER"
    ];

    if (typeof type === 'string' && validTypes.includes(type as ExpenseType)) {
      return type as ExpenseType;
    }

    return null;
  }

  /**
   * Validate and format date
   */
  private validateDate(date: any): string | null {
    if (typeof date !== 'string') return null;

    // Try parsing the date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return null;

    // Return in YYYY-MM-DD format
    return parsedDate.toISOString().split('T')[0];
  }

  /**
   * Check if OCR is available (async method that checks server config)
   */
  async isAvailable(): Promise<boolean> {
    try {
      const config = await this.getConfig();
      const useMockMode = config.dataService.environment === 'mock';

      // OCR is available if we're in mock mode OR if we have an API key for real mode
      return useMockMode || !!this.apiKey;
    } catch (error) {
      console.error("❌ Failed to check OCR availability:", error);
      // Fallback: available if we have an API key
      return !!this.apiKey;
    }
  }

  /**
   * Get OCR status message (async method that checks server config)
   */
  async getStatusMessage(): Promise<string> {
    try {
      const config = await this.getConfig();
      const useMockMode = config.dataService.environment === 'mock';

      if (useMockMode) {
        return "OCR processing in mock mode - using test data";
      } else if (this.apiKey) {
        return "OCR processing available via OpenAI GPT-4 Vision (Azure mode)";
      } else {
        return "OCR processing disabled - OpenAI API key not configured";
      }
    } catch (error) {
      console.error("❌ Failed to get OCR status:", error);
      // Fallback status message
      if (this.apiKey) {
        return "OCR processing available via OpenAI GPT-4 Vision";
      } else {
        return "OCR processing disabled - OpenAI API key not configured";
      }
    }
  }
}

export { OCRService };
export const ocrService = new OCRService();