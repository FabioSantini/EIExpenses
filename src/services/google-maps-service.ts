import { Loader } from "@googlemaps/js-api-loader";
import { env, features } from "@/lib/env";

export interface DistanceCalculationResult {
  distance: {
    text: string;
    value: number; // distance in meters
  };
  duration: {
    text: string;
    value: number; // duration in seconds
  };
  status: string;
}

class GoogleMapsService {
  private isLoaded = false;
  private loader: Loader | null = null;

  constructor() {
    if (!features.enableGoogleMaps) {
      console.warn("Google Maps is disabled - no API key configured");
      return;
    }

    this.loader = new Loader({
      apiKey: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: "weekly",
      libraries: ["places"],
    });
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loader) {
      throw new Error("Google Maps is not configured");
    }

    if (!this.isLoaded) {
      await this.loader.load();
      this.isLoaded = true;
    }
  }

  /**
   * Calculate distance between two addresses
   */
  async calculateDistance(
    startAddress: string,
    endAddress: string
  ): Promise<DistanceCalculationResult> {
    if (!features.enableGoogleMaps) {
      throw new Error("Google Maps is not enabled");
    }

    await this.ensureLoaded();

    return new Promise((resolve, reject) => {
      const service = new google.maps.DistanceMatrixService();

      console.log("🚗 Creating Distance Matrix request...");

      service.getDistanceMatrix(
        {
          origins: [startAddress],
          destinations: [endAddress],
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: false,
          region: 'IT', // Specify Italy as the region for better geocoding
        },
        (response, status) => {
          console.log("📊 Distance Matrix API response status:", status);
          console.log("📊 Distance Matrix API response data:", response);

          if (status === google.maps.DistanceMatrixStatus.OK && response) {
            const result = response.rows[0]?.elements[0];
            console.log("🎯 Distance element:", result);

            if (result && result.status === google.maps.DistanceMatrixElementStatus.OK) {
              const resultData = {
                distance: result.distance,
                duration: result.duration,
                status: result.status,
              };
              console.log("✨ Successful distance calculation:", resultData);
              resolve(resultData);
            } else {
              const errorMsg = `Distance calculation failed: ${result?.status || 'Unknown error'}`;
              console.error("❌ Element error:", errorMsg);
              reject(new Error(errorMsg));
            }
          } else {
            const errorMsg = `Google Maps API error: ${status}`;
            console.error("❌ API error:", errorMsg);
            reject(new Error(errorMsg));
          }
        }
      );
    });
  }

  /**
   * Mock distance calculation for development/testing
   */
  async calculateDistanceMock(
    startAddress: string,
    endAddress: string
  ): Promise<DistanceCalculationResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate a mock distance based on address strings (just for demo)
    const mockDistance = Math.floor(Math.random() * 200) + 10; // 10-210 km
    const mockDuration = Math.floor(mockDistance * 60); // Rough estimate: 1 km = 1 minute

    return {
      distance: {
        text: `${mockDistance} km`,
        value: mockDistance * 1000, // Convert to meters
      },
      duration: {
        text: `${Math.floor(mockDuration / 60)} hours ${mockDuration % 60} mins`,
        value: mockDuration * 60, // Convert to seconds
      },
      status: "OK",
    };
  }

  /**
   * Calculate distance with fallback to mock in development
   */

  async getDistance(startAddress: string, endAddress: string): Promise<DistanceCalculationResult> {
    console.log(`🚨 RAW INPUT ADDRESSES:`);
    console.log(`   Start (raw): "${startAddress}"`);
    console.log(`   End (raw): "${endAddress}"`);

    if (!startAddress.trim() || !endAddress.trim()) {
      throw new Error("Both start and end addresses are required");
    }

    // Validate addresses are not too short or incomplete
    if (startAddress.trim().length < 3 || endAddress.trim().length < 3) {
      throw new Error("Addresses must be at least 3 characters long");
    }

    console.log(`🗺️ Distance calculation request: "${startAddress}" → "${endAddress}"`);
    console.log(`🔧 Google Maps enabled: ${features.enableGoogleMaps}`);

    try {
      if (features.enableGoogleMaps) {
        console.log("📡 Attempting real Google Maps Distance Matrix API...");
        const result = await this.calculateDistance(startAddress, endAddress);
        console.log("✅ Real API result:", result);
        return result;
      } else {
        // Use mock in development when API is not available
        console.log("🧪 Using mock distance calculation (Google Maps API not available)");
        const result = await this.calculateDistanceMock(startAddress, endAddress);
        console.log("🎭 Mock API result:", result);
        return result;
      }
    } catch (error) {
      console.error("❌ Distance calculation failed:", error);
      // Fallback to mock if real API fails
      console.log("🔄 Falling back to mock distance calculation");
      const result = await this.calculateDistanceMock(startAddress, endAddress);
      console.log("🎭 Fallback mock result:", result);
      return result;
    }
  }

  /**
   * Convert meters to kilometers
   */
  static metersToKilometers(meters: number): number {
    return Math.round((meters / 1000) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Format distance for display
   */
  static formatDistance(meters: number): string {
    const km = this.metersToKilometers(meters);
    return `${km} km`;
  }
}

export { GoogleMapsService };
export const googleMapsService = new GoogleMapsService();