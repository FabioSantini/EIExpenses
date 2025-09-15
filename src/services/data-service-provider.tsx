"use client";

import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import { IDataService } from "./data-service";
import { DataServiceFactory, type DataServiceEnvironment } from "./data-service-factory";
import { env } from "@/lib/env";

// Create context for data service
const DataServiceContext = createContext<IDataService | null>(null);

interface DataServiceProviderProps {
  children: ReactNode;
  environment?: DataServiceEnvironment;
}

/**
 * Enhanced Data Service Provider - Uses factory pattern for flexible data service creation
 * Supports multiple environments: mock, local, enhanced, azure
 */
export function DataServiceProvider({ children, environment }: DataServiceProviderProps) {
  const service = useMemo(() => {
    try {
      // Use provided environment or auto-detect
      const dataService = environment
        ? DataServiceFactory.create({ environment })
        : DataServiceFactory.create();

      console.log(`🎯 DataServiceProvider: Using ${DataServiceFactory.getCurrentEnvironment()} data service`);
      return dataService;
    } catch (error) {
      console.error("Failed to create data service:", error);

      // Fallback to mock service if everything else fails
      console.log("🔧 DataServiceProvider: Falling back to mock service");
      return DataServiceFactory.create({ environment: 'mock' });
    }
  }, [environment]);

  return (
    <DataServiceContext.Provider value={service}>
      {children}
    </DataServiceContext.Provider>
  );
}

/**
 * Hook to use the data service
 * Works with any implementation (Mock, Enhanced Local, or Azure)
 */
export function useDataService(): IDataService {
  const context = useContext(DataServiceContext);
  if (!context) {
    throw new Error("useDataService must be used within a DataServiceProvider");
  }
  return context;
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
    if (!dataService.getStorageInfo) return;

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

  const switchEnvironment = React.useCallback((environment: DataServiceEnvironment) => {
    try {
      DataServiceFactory.switch(environment);
      setCurrentEnvironment(environment);
      console.log(`🔄 Switched to ${environment} data service`);
    } catch (error) {
      console.error(`Failed to switch to ${environment}:`, error);
    }
  }, []);

  const getAvailableEnvironments = React.useCallback(() => {
    return DataServiceFactory.getAvailableEnvironments();
  }, []);

  return {
    currentEnvironment,
    switchEnvironment,
    getAvailableEnvironments,
    isProduction: process.env.NODE_ENV === 'production'
  };
}