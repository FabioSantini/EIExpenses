/**
 * Exchange Rate Service
 * Fetches currency exchange rates from Frankfurter API (European Central Bank data)
 * All rates are based on EUR as the base currency
 * API: https://www.frankfurter.app/
 */

export interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface ExchangeRates {
  EUR: number;
  USD: number;
  GBP: number;
  CHF: number;
}

class ExchangeRateService {
  private readonly API_BASE_URL = "https://api.frankfurter.app";
  private readonly BASE_CURRENCY = "EUR";

  /**
   * Fetch latest exchange rates from Frankfurter API
   * Free, no API key required, based on European Central Bank data
   */
  async fetchLatestRates(): Promise<{ rates: ExchangeRates; lastUpdated: string }> {
    try {
      // Frankfurter API - free, no API key required
      // Fetches EUR to USD, GBP, CHF
      const response = await fetch(
        `${this.API_BASE_URL}/latest?from=${this.BASE_CURRENCY}&to=USD,GBP,CHF`
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: FrankfurterResponse = await response.json();

      if (!data.rates) {
        throw new Error("API returned invalid response");
      }

      // Extract the currencies we need
      const rates: ExchangeRates = {
        EUR: 1, // Base currency always 1
        USD: data.rates.USD || 1.10,
        GBP: data.rates.GBP || 0.85,
        CHF: data.rates.CHF || 0.95,
      };

      // Create ISO timestamp from the date
      const lastUpdated = new Date(data.date).toISOString();

      return {
        rates,
        lastUpdated,
      };
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error);
      throw new Error(
        `Failed to fetch exchange rates: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Convert amount from one currency to another
   * All conversions go through EUR as the base
   * Example: USD -> CHF = USD -> EUR -> CHF
   */
  convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: Record<string, number>
  ): number {
    // If same currency, no conversion needed
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Convert to EUR first
    const amountInEUR = fromCurrency === "EUR"
      ? amount
      : amount / rates[fromCurrency];

    // Convert from EUR to target currency
    const convertedAmount = toCurrency === "EUR"
      ? amountInEUR
      : amountInEUR * rates[toCurrency];

    // Round to 2 decimal places
    return Math.round(convertedAmount * 100) / 100;
  }

  /**
   * Format currency value with symbol
   */
  formatCurrency(amount: number, currency: string): string {
    const symbols: Record<string, string> = {
      EUR: "€",
      USD: "$",
      GBP: "£",
      CHF: "Fr",
    };

    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * Get human-readable time since last update
   */
  getTimeSinceUpdate(lastUpdatedISO?: string): string {
    if (!lastUpdatedISO) {
      return "Never updated";
    }

    const lastUpdate = new Date(lastUpdatedISO);
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
    return "Just now";
  }
}

export const exchangeRateService = new ExchangeRateService();
