import { NextRequest, NextResponse } from 'next/server';

export interface AppConfig {
  // Data service configuration
  dataService: {
    environment: 'mock' | 'azure';
    available: Array<'mock' | 'azure'>;
  };

  // Feature flags
  features: {
    ocr: boolean;
    googleMaps: boolean;
    excelExport: boolean;
    pwa: boolean;
    offline: boolean;
  };

  // Application info
  app: {
    name: string;
    version: string;
    debug: boolean;
  };

  // API configuration
  api: {
    baseUrl: string;
  };
}

/**
 * Centralized configuration endpoint
 * Reads server-side environment variables and returns safe client configuration
 * This approach keeps sensitive data on the server while providing necessary config to client
 */
export async function GET(request: NextRequest) {
  try {
    console.log('⚙️ API /config: Providing application configuration');

    // Read server-side environment variables (secure)
    const useMock = process.env.USE_MOCK === 'true';
    const hasAzureConfig = !!process.env.DATABASE_URL;
    const nodeEnv = process.env.NODE_ENV;

    // Determine data service environment based on server config
    let dataServiceEnvironment: 'mock' | 'azure';

    if (useMock) {
      dataServiceEnvironment = 'mock';
      console.log('📋 Config: Using mock data service (USE_MOCK=true)');
    } else if (hasAzureConfig) {
      dataServiceEnvironment = 'azure';
      console.log('🏢 Config: Using Azure SQL data service (DATABASE_URL configured)');
    } else {
      dataServiceEnvironment = 'mock';
      console.log('📋 Config: Fallback to mock data service (no Azure config)');
    }

    // Available environments based on server configuration
    const availableEnvironments: Array<'mock' | 'azure'> = ['mock'];
    if (hasAzureConfig) {
      availableEnvironments.push('azure');
    }

    // Build safe client configuration (no sensitive data)
    const config: AppConfig = {
      dataService: {
        environment: dataServiceEnvironment,
        available: availableEnvironments
      },

      features: {
        ocr: process.env.FEATURE_OCR === 'true',
        googleMaps: process.env.FEATURE_GOOGLE_MAPS === 'true',
        excelExport: process.env.FEATURE_EXCEL_EXPORT === 'true',
        pwa: process.env.FEATURE_PWA === 'true',
        offline: process.env.FEATURE_OFFLINE === 'true'
      },

      app: {
        name: process.env.APP_NAME || 'EI-Expenses',
        version: process.env.APP_VERSION || '0.1.0',
        debug: nodeEnv === 'development' || process.env.DEBUG === 'true'
      },

      api: {
        baseUrl: typeof window !== 'undefined' ? window.location.origin :
                process.env.APP_URL || 'http://localhost:3001'
      }
    };

    console.log('✅ Config provided:', {
      dataService: config.dataService.environment,
      availableEnvironments: config.dataService.available,
      features: Object.keys(config.features).filter(k => config.features[k as keyof typeof config.features])
    });

    return NextResponse.json(config);

  } catch (error) {
    console.error('❌ API /config error:', error);

    // Return safe fallback configuration on error
    const fallbackConfig: AppConfig = {
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
        baseUrl: 'http://localhost:3001'
      }
    };

    return NextResponse.json(fallbackConfig);
  }
}