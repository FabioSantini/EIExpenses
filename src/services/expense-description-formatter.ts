/**
 * Expense Description Formatter Service
 * Formats description column for Excel export based on expense type
 */

interface ExpenseMetadata {
  // Fuel metadata
  startLocation?: string;
  endLocation?: string;
  vehicleType?: string;
  isRoundTrip?: boolean;
  distance?: number;

  // Parking metadata
  duration?: string;

  // Meal metadata (lunch, dinner, breakfast)
  customer?: string;
  colleagues?: string[];

  // Hotel metadata
  location?: string;
  nights?: number;

  // Train metadata
  departure?: string;
  arrival?: string;

  // Generic fields
  [key: string]: any;
}

export class ExpenseDescriptionFormatter {
  /**
   * Format description based on expense type
   */
  static formatDescription(
    expenseType: string,
    description: string,
    metadata?: ExpenseMetadata | string | null
  ): string {
    // Parse metadata if it's a string
    let parsedMetadata: ExpenseMetadata | null = null;

    if (typeof metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch {
        parsedMetadata = null;
      }
    } else if (metadata && typeof metadata === 'object') {
      parsedMetadata = metadata;
    }

    // Normalize expense type (handle both English and Italian)
    const normalizedType = this.normalizeExpenseType(expenseType);

    switch (normalizedType) {
      case 'FUEL':
        return this.formatFuelDescription(description, parsedMetadata);

      case 'PARKING':
        return this.formatParkingDescription(description, parsedMetadata);

      case 'LUNCH':
      case 'DINNER':
      case 'BREAKFAST':
        return this.formatMealDescription(description, parsedMetadata);

      case 'HOTEL':
        return this.formatHotelDescription(description, parsedMetadata);

      case 'TRAIN':
        return this.formatTrainDescription(description, parsedMetadata);

      case 'TELEPASS':
      case 'TOURIST_TAX':
      case 'OTHER':
      default:
        return description;
    }
  }

  /**
   * Normalize expense type to standard format
   */
  private static normalizeExpenseType(type: string): string {
    const normalized = type.toUpperCase();

    // Map Italian to English
    const typeMap: Record<string, string> = {
      'CARBURANTE': 'FUEL',
      'PARCHEGGIO': 'PARKING',
      'PRANZO': 'LUNCH',
      'CENA': 'DINNER',
      'COLAZIONE': 'BREAKFAST',
      'ALBERGO': 'HOTEL',
      'TRENO': 'TRAIN',
      'TASSA DI SOGGIORNO': 'TOURIST_TAX',
      'ALTRO': 'OTHER',
    };

    return typeMap[normalized] || normalized;
  }

  /**
   * Format: Description - Start Location - End Location - Vehicle Type - roundtrip/one way
   */
  private static formatFuelDescription(
    description: string,
    metadata: ExpenseMetadata | null
  ): string {
    if (!metadata) return description;

    const parts: string[] = [description];

    if (metadata.startLocation) {
      parts.push(metadata.startLocation);
    }

    if (metadata.endLocation) {
      parts.push(metadata.endLocation);
    }

    if (metadata.vehicleType) {
      parts.push(metadata.vehicleType);
    }

    if (metadata.isRoundTrip !== undefined) {
      parts.push(metadata.isRoundTrip ? 'roundtrip' : 'one way');
    }

    return parts.join(' - ');
  }

  /**
   * Format: Description - Duration
   */
  private static formatParkingDescription(
    description: string,
    metadata: ExpenseMetadata | null
  ): string {
    if (!metadata || !metadata.duration) return description;

    return `${description} - ${metadata.duration}`;
  }

  /**
   * Format: Description - Customer/Company - Colleagues
   */
  private static formatMealDescription(
    description: string,
    metadata: ExpenseMetadata | null
  ): string {
    if (!metadata) return description;

    const parts: string[] = [description];

    if (metadata.customer) {
      parts.push(metadata.customer);
    }

    if (metadata.colleagues && Array.isArray(metadata.colleagues) && metadata.colleagues.length > 0) {
      parts.push(metadata.colleagues.join(', '));
    }

    return parts.join(' - ');
  }

  /**
   * Format: Description - Hotel Location - Number Of Nights
   */
  private static formatHotelDescription(
    description: string,
    metadata: ExpenseMetadata | null
  ): string {
    if (!metadata) return description;

    const parts: string[] = [description];

    if (metadata.location) {
      parts.push(metadata.location);
    }

    if (metadata.nights !== undefined) {
      parts.push(metadata.nights.toString());
    }

    return parts.join(' - ');
  }

  /**
   * Format: Description - Departure - Arrival
   */
  private static formatTrainDescription(
    description: string,
    metadata: ExpenseMetadata | null
  ): string {
    if (!metadata) return description;

    const parts: string[] = [description];

    if (metadata.departure) {
      parts.push(metadata.departure);
    }

    if (metadata.arrival) {
      parts.push(metadata.arrival);
    }

    return parts.join(' - ');
  }

  /**
   * Extract KM value for fuel expenses
   */
  static extractKilometers(
    expenseType: string,
    metadata?: ExpenseMetadata | string | null
  ): number | null {
    const normalizedType = this.normalizeExpenseType(expenseType);

    if (normalizedType !== 'FUEL') {
      return null;
    }

    // Parse metadata if it's a string
    let parsedMetadata: ExpenseMetadata | null = null;

    if (typeof metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch {
        return null;
      }
    } else if (metadata && typeof metadata === 'object') {
      parsedMetadata = metadata;
    }

    return parsedMetadata?.distance ?? null;
  }
}
