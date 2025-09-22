"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { IDataService } from "./data-service";
import { DataServiceFactory, type DataServiceEnvironment } from "./data-service-factory";

// Create context for data service
const DataServiceContext = createContext<IDataService | null>(null);

interface DataServiceProviderProps {
  children: ReactNode;
  environment?: DataServiceEnvironment;
}

/**
 * Enhanced Data Service Provider - Uses async factory pattern for flexible data service creation
 * Fetches configuration from centralized server endpoint for security
 * Supports multiple environments: mock, azure
 */
export function DataServiceProvider({ children, environment }: DataServiceProviderProps) {
  const { data: session, status } = useSession();
  const [service, setService] = useState<IDataService | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Wait for session to be loaded before initializing data service
    if (status === 'loading') {
      console.log('⏳ DataServiceProvider: Waiting for session to load...');
      return;
    }

    async function initializeService() {
      try {
        setIsLoading(true);
        console.log('⚙️ DataServiceProvider: Initializing data service...');
        console.log('🔍 DataServiceProvider: Environment override provided:', environment);
        console.log('🔍 DataServiceProvider: Session status:', status);
        console.log('🔍 DataServiceProvider: Session user email:', session?.user?.email);

        // Use provided environment or auto-detect from server config
        const dataService = environment
          ? await DataServiceFactory.create({ environment, userEmail: session?.user?.email })
          : await DataServiceFactory.create({ userEmail: session?.user?.email });

        console.log('✅ DataServiceProvider: Data service created successfully');

        if (isMounted) {
          setService(dataService);
          console.log(`🎯 DataServiceProvider: Using ${DataServiceFactory.getCurrentEnvironment()} data service`);
          if (session?.user?.email) {
            console.log(`👤 DataServiceProvider: User context: ${session.user.email}`);
          }
        }
      } catch (error) {
        console.error("❌ DataServiceProvider: Failed to create data service:", error);
        console.error("🔍 DataServiceProvider: Error details:", error.message || error);
        console.error("🔍 DataServiceProvider: Error stack:", error.stack);

        if (isMounted) {
          // Check server config to see if fallback to mock is allowed
          try {
            console.log("🔧 DataServiceProvider: Checking if fallback to mock is allowed...");
            const response = await fetch('/api/config');
            const config = await response.json();
            console.log("🔧 DataServiceProvider: Server config environment:", config.dataService.environment);

            if (config.dataService.environment === 'azure') {
              console.error("🚨 DataServiceProvider: Server is configured for Azure, NOT falling back to mock!");
              console.error("🚨 DataServiceProvider: This indicates a real Azure SQL connection issue that needs to be fixed");
              setService(null); // Don't fallback, force error to be visible
            } else {
              console.log("🔧 DataServiceProvider: Server allows mock, falling back to mock service");
              const fallbackService = await DataServiceFactory.create({
                environment: 'mock',
                userEmail: session?.user?.email
              });
              setService(fallbackService);
            }
          } catch (fallbackError) {
            console.error("❌ DataServiceProvider: Even config check failed:", fallbackError);
            console.error("🚨 DataServiceProvider: Cannot determine server config, NOT falling back to mock");
            setService(null); // Don't fallback on config errors
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeService();

    return () => {
      isMounted = false;
    };
  }, [environment, session?.user?.email, status]);

  // Show loading state while service is being initialized
  if (isLoading || !service) {
    return (
      <DataServiceContext.Provider value={null}>
        {children}
      </DataServiceContext.Provider>
    );
  }

  return (
    <DataServiceContext.Provider value={service}>
      {children}
    </DataServiceContext.Provider>
  );
}

/**
 * Hook to use the data service
 * Works with any implementation (Mock, Enhanced Local, or Azure)
 * Returns null during loading phase - components should handle this
 */
export function useDataService(): IDataService | null {
  const context = useContext(DataServiceContext);
  if (context === undefined) {
    throw new Error("useDataService must be used within a DataServiceProvider");
  }
  return context; // Can be null during loading
}

/**
 * Hook to use the data service with loading state
 * Provides both service and loading information
 */
export function useDataServiceWithLoading(): { service: IDataService | null; isLoading: boolean } {
  const service = useDataService();
  return {
    service,
    isLoading: service === null
  };
}

/**
 * Hook to get current data service environment
 */
export function useDataServiceType(): DataServiceEnvironment {
  return DataServiceFactory.getCurrentEnvironment() || 'mock';
}

/**
 * Hook to get data service capabilities
 */
export function useDataServiceCapabilities() {
  const serviceType = useDataServiceType();

  return useMemo(() => {
    const capabilities = {
      hasOfflineSupport: serviceType !== 'azure',
      hasPersistentStorage: serviceType === 'enhanced' || serviceType === 'azure',
      hasFileStorage: serviceType === 'enhanced' || serviceType === 'azure',
      hasLargeStorage: serviceType === 'enhanced' || serviceType === 'azure',
      hasOCR: false, // Will be true in Phase B
      hasGoogleMaps: false, // Will be true in Phase B
      storageLimit: serviceType === 'local' ? '5MB' : serviceType === 'enhanced' ? '250MB+' : 'Unlimited'
    };

    return capabilities;
  }, [serviceType]);
}

/**
 * Hook to test and display storage information
 */
export function useStorageInfo() {
  const dataService = useDataService();
  const [storageInfo, setStorageInfo] = React.useState<{ used: number; available: number } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const refreshStorageInfo = React.useCallback(async () => {
    if (!dataService || !dataService.getStorageInfo) return;

    try {
      setIsLoading(true);
      const info = await dataService.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to get storage info:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dataService]);

  React.useEffect(() => {
    refreshStorageInfo();
  }, [refreshStorageInfo]);

  return {
    storageInfo,
    isLoading,
    refreshStorageInfo
  };
}

/**
 * Development helper hook to switch data service environments
 * Should only be used in development/testing
 */
export function useDataServiceSwitch() {
  const [currentEnvironment, setCurrentEnvironment] = React.useState<DataServiceEnvironment | null>(
    DataServiceFactory.getCurrentEnvironment()
  );
  const [availableEnvironments, setAvailableEnvironments] = React.useState<DataServiceEnvironment[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  // Load available environments on mount
  React.useEffect(() => {
    async function loadEnvironments() {
      try {
        const environments = await DataServiceFactory.getAvailableEnvironments();
        setAvailableEnvironments(environments);
      } catch (error) {
        console.error('Failed to load available environments:', error);
        setAvailableEnvironments(['mock']); // Fallback
      }
    }
    loadEnvironments();
  }, []);

  const switchEnvironment = React.useCallback(async (environment: DataServiceEnvironment) => {
    try {
      setIsLoading(true);
      await DataServiceFactory.switch(environment);
      setCurrentEnvironment(environment);
      console.log(`🔄 Switched to ${environment} data service`);
    } catch (error) {
      console.error(`Failed to switch to ${environment}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    currentEnvironment,
    availableEnvironments,
    switchEnvironment,
    isLoading,
    isProduction: process.env.NODE_ENV === 'production'
  };
}