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

    // Handle typed metadata format: { type: 'FUEL', data: { ... } }
    if (parsedMetadata && (parsedMetadata as any).type && (parsedMetadata as any).data) {
      parsedMetadata = (parsedMetadata as any).data;
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

    // Support both camelCase and space-separated keys
    const startLocation = metadata.startLocation || (metadata as any)['start location'];
    const endLocation = metadata.endLocation || (metadata as any)['end location'];
    const vehicleType = metadata.vehicleType || (metadata as any)['vehicle type'];
    const isRoundTrip = metadata.isRoundTrip !== undefined ? metadata.isRoundTrip : (metadata as any)['roundtrip'];

    if (startLocation) {
      parts.push(startLocation);
    }

    if (endLocation) {
      parts.push(endLocation);
    }

    if (vehicleType) {
      parts.push(vehicleType);
    }

    if (isRoundTrip !== undefined) {
      parts.push(isRoundTrip ? 'roundtrip' : 'one way');
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
    if (!metadata) return description;

    // Support both camelCase and space-separated keys
    const duration = metadata.duration || (metadata as any)['parking duration'] || (metadata as any)['duration'];

    if (!duration) return description;

    return `${description} - ${duration}`;
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

    // Support both camelCase and space-separated keys
    const customer = metadata.customer || (metadata as any)['customer name'] || (metadata as any)['customer'];
    const colleagues = metadata.colleagues || (metadata as any)['colleague names'] || (metadata as any)['colleagues'];

    if (customer) {
      parts.push(customer);
    }

    if (colleagues && Array.isArray(colleagues) && colleagues.length > 0) {
      parts.push(colleagues.join(', '));
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

    // Support both camelCase and space-separated keys
    const location = metadata.location || (metadata as any)['hotel location'] || (metadata as any)['location'];
    const nights = metadata.nights !== undefined ? metadata.nights : (metadata as any)['number of nights'] || (metadata as any)['nights'];

    if (location) {
      parts.push(location);
    }

    if (nights !== undefined) {
      parts.push(nights.toString());
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

    // Support both camelCase and space-separated keys
    const departure = metadata.departure || (metadata as any)['departure station'] || (metadata as any)['departure'];
    const arrival = metadata.arrival || (metadata as any)['arrival station'] || (metadata as any)['arrival'];

    if (departure) {
      parts.push(departure);
    }

    if (arrival) {
      parts.push(arrival);
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

    // Handle typed metadata format: { type: 'FUEL', data: { ... } }
    if (parsedMetadata && (parsedMetadata as any).type && (parsedMetadata as any).data) {
      parsedMetadata = (parsedMetadata as any).data;
    }

    // Support both camelCase and space-separated keys
    const distance = parsedMetadata?.distance;

    return distance ?? null;
  }
}
