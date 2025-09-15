import { z } from "zod";

// Settings schema
const AppSettingsSchema = z.object({
  fuel: z.object({
    costPerKm: z.number().positive().default(0.93),
    defaultVehicleType: z.enum(["car", "truck", "motorcycle"]).default("car"),
    restrictToItaly: z.boolean().default(true),
  }),
  currency: z.object({
    default: z.string().length(3).default("EUR"),
    allowedCurrencies: z.array(z.string().length(3)).default(["EUR", "USD", "GBP"]),
  }),
  ui: z.object({
    theme: z.enum(["light", "dark", "system"]).default("light"),
    dateFormat: z.enum(["dd/mm/yyyy", "mm/dd/yyyy", "yyyy-mm-dd"]).default("dd/mm/yyyy"),
  }),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

// Default settings
const defaultSettings: AppSettings = {
  fuel: {
    costPerKm: 0.93,
    defaultVehicleType: "car",
    restrictToItaly: true,
  },
  currency: {
    default: "EUR",
    allowedCurrencies: ["EUR", "USD", "GBP"],
  },
  ui: {
    theme: "light",
    dateFormat: "dd/mm/yyyy",
  },
};

class SettingsService {
  private readonly STORAGE_KEY = "ei-expenses-settings";

  /**
   * Get all settings
   */
  getSettings(): AppSettings {
    try {
      if (typeof window === "undefined") {
        return defaultSettings;
      }

      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return defaultSettings;
      }

      const parsed = JSON.parse(stored);
      return AppSettingsSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to load settings:", error);
      return defaultSettings;
    }
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<AppSettings>): AppSettings {
    try {
      const current = this.getSettings();
      const updated = {
        ...current,
        ...settings,
        fuel: { ...current.fuel, ...settings.fuel },
        currency: { ...current.currency, ...settings.currency },
        ui: { ...current.ui, ...settings.ui },
      };

      const validated = AppSettingsSchema.parse(updated);

      if (typeof window !== "undefined") {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validated));
      }

      return validated;
    } catch (error) {
      console.error("Failed to update settings:", error);
      throw new Error("Invalid settings data");
    }
  }

  /**
   * Get specific setting value
   */
  getSetting<T extends keyof AppSettings>(category: T): AppSettings[T] {
    return this.getSettings()[category];
  }

  /**
   * Update specific setting category
   */
  updateSetting<T extends keyof AppSettings>(
    category: T,
    value: Partial<AppSettings[T]>
  ): AppSettings {
    const current = this.getSettings();
    return this.updateSettings({
      ...current,
      [category]: { ...current[category], ...value },
    } as Partial<AppSettings>);
  }

  /**
   * Reset to default settings
   */
  resetSettings(): AppSettings {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    return defaultSettings;
  }

  /**
   * Get fuel cost per km
   */
  getFuelCostPerKm(): number {
    return this.getSetting("fuel").costPerKm;
  }

  /**
   * Update fuel cost per km
   */
  setFuelCostPerKm(costPerKm: number): AppSettings {
    return this.updateSetting("fuel", { costPerKm });
  }

  /**
   * Export settings as JSON
   */
  exportSettings(): string {
    return JSON.stringify(this.getSettings(), null, 2);
  }

  /**
   * Import settings from JSON
   */
  importSettings(jsonString: string): AppSettings {
    try {
      const parsed = JSON.parse(jsonString);
      const validated = AppSettingsSchema.parse(parsed);

      if (typeof window !== "undefined") {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validated));
      }

      return validated;
    } catch (error) {
      console.error("Failed to import settings:", error);
      throw new Error("Invalid settings format");
    }
  }
}

export const settingsService = new SettingsService();

// React hook for using settings
export function useSettings() {
  const [settings, setSettings] = React.useState<AppSettings>(() =>
    settingsService.getSettings()
  );

  const updateSettings = React.useCallback((newSettings: Partial<AppSettings>) => {
    const updated = settingsService.updateSettings(newSettings);
    setSettings(updated);
    return updated;
  }, []);

  const resetSettings = React.useCallback(() => {
    const reset = settingsService.resetSettings();
    setSettings(reset);
    return reset;
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    getFuelCostPerKm: () => settingsService.getFuelCostPerKm(),
    setFuelCostPerKm: (costPerKm: number) => {
      const updated = settingsService.setFuelCostPerKm(costPerKm);
      setSettings(updated);
      return updated;
    },
  };
}

// We need to import React for the hook
import React from "react";