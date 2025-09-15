import type { IDataService } from "./data-service";
import { MockDataService } from "./mock-data-service";

export type DataServiceEnvironment = 'mock' | 'azure';

interface DataServiceOptions {
  environment?: DataServiceEnvironment;
}

/**
 * Factory for creating data service instances based on environment
 * Supports mock (local development) and azure (production) environments
 */
export class DataServiceFactory {
  private static instance: IDataService | null = null;
  private static currentEnvironment: DataServiceEnvironment | null = null;

  /**
   * Create a data service instance based on environment
   */
  static create(options: DataServiceOptions = {}): IDataService {
    const {
      environment = this.getEnvironmentFromConfig()
    } = options;

    // Return existing instance if same environment
    if (this.instance && this.currentEnvironment === environment) {
      return this.instance;
    }

    console.log(`🏭 DataServiceFactory: Creating ${environment} data service`);

    switch (environment) {
      case 'mock':
        this.instance = new MockDataService();
        break;

      case 'azure':
        // TODO: Implement AzureDataService
        throw new Error('Azure data service not yet implemented - will be available when we build the production version');

      default:
        throw new Error(`Unknown data service environment: ${environment}. Supported: 'mock', 'azure'`);
    }

    this.currentEnvironment = environment;
    console.log(`✅ DataServiceFactory: ${environment} data service created successfully`);

    if (!this.instance) {
      throw new Error('Failed to create data service instance');
    }
    return this.instance;
  }

  /**
   * Get environment from app configuration
   */
  private static getEnvironmentFromConfig(): DataServiceEnvironment {
    if (typeof window === 'undefined') {
      return 'mock'; // Server-side default
    }

    // Check environment variables
    const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
    const nodeEnv = process.env.NODE_ENV;

    // Use mock for development, testing, or when explicitly requested
    if (useMock || nodeEnv === 'development' || nodeEnv === 'test') {
      return 'mock';
    }

    // Check for Azure configuration in production
    const hasAzureConfig = process.env.DATABASE_URL && process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (hasAzureConfig && nodeEnv === 'production') {
      return 'azure';
    }

    // Default to mock for safety
    return 'mock';
  }

  /**
   * Switch to a different environment (useful for testing and admin tools)
   */
  static switch(environment: DataServiceEnvironment): IDataService {
    console.log(`🔄 DataServiceFactory: Switching from ${this.currentEnvironment} to ${environment}`);

    // Clean up existing instance if needed
    if (this.instance && this.currentEnvironment) {
      this.cleanup();
    }

    this.instance = null;
    this.currentEnvironment = null;

    return this.create({ environment });
  }

  /**
   * Get current data service instance
   */
  static getInstance(): IDataService {
    if (!this.instance) {
      this.instance = this.create();
    }
    return this.instance;
  }

  /**
   * Get current environment
   */
  static getCurrentEnvironment(): DataServiceEnvironment | null {
    return this.currentEnvironment;
  }

  /**
   * Get available environments
   */
  static getAvailableEnvironments(): DataServiceEnvironment[] {
    const environments: DataServiceEnvironment[] = ['mock'];

    // Check for Azure configuration
    if (process.env.DATABASE_URL && process.env.AZURE_STORAGE_CONNECTION_STRING) {
      environments.push('azure');
    }

    return environments;
  }

  /**
   * Cleanup resources
   */
  private static cleanup(): void {
    console.log('🧹 DataServiceFactory: Cleaning up resources');
  }

  /**
   * Reset factory (useful for testing)
   */
  static reset(): void {
    this.cleanup();
    this.instance = null;
    this.currentEnvironment = null;
  }
}

// Create and export default instance
export const dataService = DataServiceFactory.getInstance();