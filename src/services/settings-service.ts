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
  authentication: z.object({
    automaticLogin: z.boolean().default(true),
    prompt: z.enum(["none", "login", "select_account"]).default("none"),
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
  authentication: {
    automaticLogin: true,
    prompt: "none",
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
      // Ensure authentication property exists with defaults
      const withDefaults = {
        ...defaultSettings,
        ...parsed,
        authentication: {
          ...defaultSettings.authentication,
          ...parsed.authentication,
        },
      };
      return AppSettingsSchema.parse(withDefaults);
    } catch (error) {
      console.error("Failed to load settings:", error);
      return defaultSettings;
    }
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<AppSettings>): AppSettings {
    console.log("SettingsService.updateSettings called with:", settings);
    try {
      const current = this.getSettings();
      console.log("Current settings:", current);

      const updated = {
        ...current,
        ...settings,
        fuel: { ...current.fuel, ...settings.fuel },
        currency: { ...current.currency, ...settings.currency },
        ui: { ...current.ui, ...settings.ui },
        authentication: { ...current.authentication, ...settings.authentication },
      };

      console.log("Updated settings before validation:", updated);
      const validated = AppSettingsSchema.parse(updated);
      console.log("Settings validated successfully:", validated);

      if (typeof window !== "undefined") {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validated));
        console.log("Settings saved to localStorage successfully");
      }

      console.log("Returning validated settings:", validated);
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