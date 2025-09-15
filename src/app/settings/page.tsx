"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { settingsService, type AppSettings } from "@/services/settings-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeftIcon,
  SettingsIcon,
  CarIcon,
  SaveIcon,
  RefreshCwIcon,
  DownloadIcon,
  UploadIcon,
} from "lucide-react";

// Form validation schema
const SettingsFormSchema = z.object({
  fuelCostPerKm: z.number().positive("Cost per km must be positive").max(10, "Cost per km seems too high"),
  defaultVehicleType: z.enum(["car", "truck", "motorcycle"]),
  defaultCurrency: z.string().length(3),
  theme: z.enum(["light", "dark", "system"]),
  dateFormat: z.enum(["dd/mm/yyyy", "mm/dd/yyyy", "yyyy-mm-dd"]),
});

type SettingsFormData = z.infer<typeof SettingsFormSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(SettingsFormSchema),
  });

  // Load settings on mount
  useEffect(() => {
    const currentSettings = settingsService.getSettings();
    setSettings(currentSettings);

    // Set form values
    reset({
      fuelCostPerKm: currentSettings.fuel.costPerKm,
      defaultVehicleType: currentSettings.fuel.defaultVehicleType,
      defaultCurrency: currentSettings.currency.default,
      theme: currentSettings.ui.theme,
      dateFormat: currentSettings.ui.dateFormat,
    });
  }, [reset]);

  const onSubmit = async (data: SettingsFormData) => {
    setIsLoading(true);
    try {
      const updatedSettings = settingsService.updateSettings({
        fuel: {
          costPerKm: data.fuelCostPerKm,
          defaultVehicleType: data.defaultVehicleType,
          restrictToItaly: settings?.fuel.restrictToItaly ?? true,
        },
        currency: {
          default: data.defaultCurrency,
          allowedCurrencies: settings?.currency.allowedCurrencies ?? ["EUR", "USD", "GBP"],
        },
        ui: {
          theme: data.theme,
          dateFormat: data.dateFormat,
        },
      });

      setSettings(updatedSettings);

      toast({
        title: "Settings Saved",
        description: "Your preferences have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    const defaultSettings = settingsService.resetSettings();
    setSettings(defaultSettings);

    reset({
      fuelCostPerKm: defaultSettings.fuel.costPerKm,
      defaultVehicleType: defaultSettings.fuel.defaultVehicleType,
      defaultCurrency: defaultSettings.currency.default,
      theme: defaultSettings.ui.theme,
      dateFormat: defaultSettings.ui.dateFormat,
    });

    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values.",
    });
  };

  const handleExport = () => {
    try {
      const settingsJson = settingsService.exportSettings();
      const blob = new Blob([settingsJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ei-expenses-settings.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Settings Exported",
        description: "Your settings have been exported to a JSON file.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export settings.",
        variant: "destructive",
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedSettings = settingsService.importSettings(content);
        setSettings(importedSettings);

        reset({
          fuelCostPerKm: importedSettings.fuel.costPerKm,
          defaultVehicleType: importedSettings.fuel.defaultVehicleType,
          defaultCurrency: importedSettings.currency.default,
          theme: importedSettings.ui.theme,
          dateFormat: importedSettings.ui.dateFormat,
        });

        toast({
          title: "Settings Imported",
          description: "Your settings have been imported successfully.",
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid settings file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
            disabled={isLoading}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center mb-2">
            <SettingsIcon className="w-6 h-6 mr-3 text-primary" />
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          </div>
          <p className="text-slate-600">
            Configure your preferences for expense tracking and calculations
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Fuel Expense Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CarIcon className="w-5 h-5 mr-2" />
                Fuel Expense Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fuelCostPerKm">Cost per Kilometer (€)</Label>
                  <Input
                    id="fuelCostPerKm"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="10"
                    {...register("fuelCostPerKm", { valueAsNumber: true })}
                    placeholder="0.93"
                    disabled={isLoading}
                  />
                  {errors.fuelCostPerKm && (
                    <p className="text-sm text-red-600 mt-1">{errors.fuelCostPerKm.message}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    This will be used to automatically calculate fuel expenses based on distance
                  </p>
                </div>

                <div>
                  <Label htmlFor="defaultVehicleType">Default Vehicle Type</Label>
                  <Select
                    value={watch("defaultVehicleType")}
                    onValueChange={(value) => setValue("defaultVehicleType", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Current calculation preview */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-blue-900 mb-1">Example Calculation</h4>
                <p className="text-sm text-blue-700">
                  100 km trip = €{((watch("fuelCostPerKm") || 0.93) * 100).toFixed(2)}
                  <br />
                  100 km roundtrip = €{((watch("fuelCostPerKm") || 0.93) * 200).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Currency Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Currency & Regional Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Select
                    value={watch("defaultCurrency")}
                    onValueChange={(value) => setValue("defaultCurrency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={watch("dateFormat")}
                    onValueChange={(value) => setValue("dateFormat", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/mm/yyyy">DD/MM/YYYY (European)</SelectItem>
                      <SelectItem value="mm/dd/yyyy">MM/DD/YYYY (US)</SelectItem>
                      <SelectItem value="yyyy-mm-dd">YYYY-MM-DD (ISO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* UI Settings */}
          <Card>
            <CardHeader>
              <CardTitle>User Interface</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={watch("theme")}
                  onValueChange={(value) => setValue("theme", value as any)}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Theme preferences (dark mode coming soon)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || !isDirty}
              className="flex-1 sm:flex-none"
            >
              <SaveIcon className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleExport}
                disabled={isLoading}
                className="flex-1 sm:flex-none"
              >
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  className="flex-1 sm:flex-none"
                >
                  <UploadIcon className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Help Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Settings Help</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>
              <strong>Cost per Kilometer:</strong> Used for automatic fuel expense calculation.
              Current Italian standard is approximately €0.93 per km.
            </p>
            <p>
              <strong>Export/Import:</strong> Save your settings as a JSON file to backup or
              transfer between devices.
            </p>
            <p>
              <strong>Reset to Defaults:</strong> Restores all settings to their original values.
              This action cannot be undone.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}