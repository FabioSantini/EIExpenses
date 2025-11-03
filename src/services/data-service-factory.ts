import type { IDataService } from "./data-service";
import type { AppConfig } from "@/app/api/config/route";

export type DataServiceEnvironment = 'mock' | 'azure';

interface DataServiceOptions {
  environment?: DataServiceEnvironment;
  userEmail?: string | null;
}

/**
 * Factory for creating data service instances based on centralized server configuration
 * Supports mock (local development) and azure (production) environments
 * Configuration is fetched securely from server-side /api/config endpoint
 *
 * IMPORTANT: Uses dynamic imports to avoid bundling browser-only code (MockDataService)
 * for server-side rendering, which would cause "File is not defined" errors.
 */
export class DataServiceFactory {
  private static instance: IDataService | null = null;
  private static currentEnvironment: DataServiceEnvironment | null = null;
  private static configCache: AppConfig | null = null;
  private static configPromise: Promise<AppConfig> | null = null;

  /**
   * Create a data service instance based on server configuration
   */
  static async create(options: DataServiceOptions = {}): Promise<IDataService> {
    const config = await this.getConfig();
    const {
      environment = config.dataService.environment,
      userEmail
    } = options;

    // Return existing instance if same environment
    if (this.instance && this.currentEnvironment === environment) {
      // Update user context if provided
      if (userEmail && this.instance.setUserContext) {
        this.instance.setUserContext(userEmail);
      }
      return this.instance;
    }

    console.log(`🏭 DataServiceFactory: Creating ${environment} data service (from server config)`);
    console.log(`🔷 DataServiceFactory: Environment forced to:`, environment);

    switch (environment) {
      case 'mock':
        console.log(`🔷 DataServiceFactory: Creating MockDataService (dynamic import)`);
        // Dynamic import to avoid bundling browser-only code for SSR
        const { MockDataService } = await import("./mock-data-service");
        this.instance = new MockDataService(userEmail || undefined);
        break;

      case 'azure':
        console.log(`🔷 DataServiceFactory: Creating AzureSqlDataService (dynamic import)`);
        // Dynamic import for consistency and code splitting
        const { AzureSqlDataService } = await import("./azure-sql-data-service");
        this.instance = new AzureSqlDataService();
        if (userEmail && this.instance.setUserContext) {
          this.instance.setUserContext(userEmail);
        }
        break;

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
   * Get configuration from centralized server endpoint
   * Uses caching to avoid repeated API calls
   */
  private static async getConfig(): Promise<AppConfig> {
    // Return cached config if available
    if (this.configCache) {
      return this.configCache;
    }

    // Return existing promise if already fetching
    if (this.configPromise) {
      return this.configPromise;
    }

    // Fetch configuration from server
    this.configPromise = this.fetchConfig();
    this.configCache = await this.configPromise;
    this.configPromise = null;

    return this.configCache;
  }

  /**
   * Fetch configuration from server API endpoint
   */
  private static async fetchConfig(): Promise<AppConfig> {
    try {
      console.log('⚙️ DataServiceFactory: Fetching configuration from server');

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/config`);

      if (!response.ok) {
        throw new Error(`Config API error: ${response.status} ${response.statusText}`);
      }

      const config: AppConfig = await response.json();

      console.log('✅ DataServiceFactory: Configuration received:', {
        dataService: config.dataService.environment,
        available: config.dataService.available,
        features: Object.keys(config.features).filter(k => config.features[k as keyof typeof config.features])
      });

      return config;

    } catch (error) {
      console.warn('⚠️ DataServiceFactory: Failed to fetch config, using fallback:', error);

      // Fallback configuration
      return {
        dataService: {
          environment: 'mock',
          available: ['mock']
        },
        features: {
          ocr: false,
          googleMaps: false,
          excelExport: false,
          pwa: false,
          offline: false
        },
        app: {
          name: 'EI-Expenses',
          version: '0.1.0',
          debug: false
        },
        api: {
          baseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
        }
      };
    }
  }

  /**
   * Switch to a different environment (useful for testing and admin tools)
   */
  static async switch(environment: DataServiceEnvironment): Promise<IDataService> {
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
  static async getInstance(): Promise<IDataService> {
    if (!this.instance) {
      this.instance = await this.create();
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
   * Get available environments from server configuration
   */
  static async getAvailableEnvironments(): Promise<DataServiceEnvironment[]> {
    const config = await this.getConfig();
    return config.dataService.available;
  }

  /**
   * Get application configuration (useful for components that need config)
   */
  static async getAppConfig(): Promise<AppConfig> {
    return this.getConfig();
  }

  /**
   * Clear configuration cache (useful for testing or config changes)
   */
  static clearConfigCache(): void {
    console.log('🧹 DataServiceFactory: Clearing configuration cache');
    this.configCache = null;
    this.configPromise = null;
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

// Note: Default instance creation is now async
// Components should use DataServiceFactory.getInstance() or DataServiceProvider