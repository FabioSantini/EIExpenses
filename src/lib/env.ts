import { EnvironmentSchema } from "./validations";

// Validate and export environment variables
export const env = EnvironmentSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  // NOTE: NEXT_PUBLIC_USE_MOCK kept for backward compatibility but services now use centralized /api/config
  NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  DATABASE_URL: process.env.DATABASE_URL,
  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
});

// Feature flags based on environment
// NOTE: Features now determined by centralized /api/config for better security
export const features = {
  // OCR availability is now determined by server config and API key availability
  enableOCR: Boolean(env.OPENAI_API_KEY),
  enableGoogleMaps: Boolean(env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
  enablePWA: process.env.NEXT_PUBLIC_FEATURE_PWA === "true",
  enableOffline: process.env.NEXT_PUBLIC_FEATURE_OFFLINE === "true",
} as const;

// Development utilities
export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

// Mock data settings
// NOTE: Mock mode is now determined by server configuration via /api/config
export const mockConfig = {
  dataDelay: Number(process.env.MOCK_DATA_DELAY) || 500,
  ocrDelay: Number(process.env.MOCK_OCR_DELAY) || 1500,
  seedData: process.env.MOCK_DATA_SEED === "true",
} as const;