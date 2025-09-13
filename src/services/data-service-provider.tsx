"use client";

import React, { createContext, useContext, useMemo, type ReactNode } from "react";
import { IDataService } from "./data-service";
import { MockDataService } from "./mock-data-service";
import { env } from "@/lib/env";

// Create context for data service
const DataServiceContext = createContext<IDataService | null>(null);

interface DataServiceProviderProps {
  children: ReactNode;
}

/**
 * Data Service Provider - Provides the correct data service based on environment
 * Switches between MockDataService (development) and AzureDataService (production)
 */
export function DataServiceProvider({ children }: DataServiceProviderProps) {
  const service = useMemo(() => {
    if (env.NEXT_PUBLIC_USE_MOCK) {
      console.log("🔧 Using Mock Data Service - No database required");
      return new MockDataService();
    } else {
      console.log("☁️ Using Azure Data Service - Production mode");
      // TODO: Return new AzureDataService() when implemented
      throw new Error("Azure Data Service not implemented yet. Set NEXT_PUBLIC_USE_MOCK=true in .env.local");
    }
  }, []);

  return (
    <DataServiceContext.Provider value={service}>
      {children}
    </DataServiceContext.Provider>
  );
}

/**
 * Hook to use the data service
 * Works with any implementation (Mock or Azure)
 */
export function useDataService(): IDataService {
  const context = useContext(DataServiceContext);
  if (!context) {
    throw new Error("useDataService must be used within a DataServiceProvider");
  }
  return context;
}

/**
 * Hook to check which data service is being used
 */
export function useDataServiceType(): "mock" | "azure" {
  return env.NEXT_PUBLIC_USE_MOCK ? "mock" : "azure";
}