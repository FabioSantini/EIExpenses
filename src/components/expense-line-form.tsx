"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useExpenseLines, useSuggestions } from "@/hooks/use-expenses";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GooglePlacesAutocomplete } from "@/components/google-places-autocomplete";
import { googleMapsService, GoogleMapsService } from "@/services/google-maps-service";
import { settingsService } from "@/services/settings-service";
import {
  SaveIcon,
  ArrowLeftIcon,
  ReceiptIcon,
  MapPinIcon,
  UsersIcon,
  UserIcon,
  CarIcon,
  UtensilsIcon,
  BuildingIcon,
  ParkingCircleIcon,
  TrainIcon,
  CalculatorIcon,
  LoaderIcon,
  SettingsIcon,
} from "lucide-react";
import type { ExpenseLine, ExpenseType } from "@/types";

// Expense types with proper enum values
const expenseTypes: ExpenseType[] = [
  "PARKING",
  "FUEL",
  "TELEPASS",
  "LUNCH",
  "DINNER",
  "HOTEL",
  "TRAIN",
  "BREAKFAST",
  "TOURIST_TAX",
  "OTHER",
];

// Form validation schema
const expenseLineSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: z.enum(expenseTypes as [ExpenseType, ...ExpenseType[]], {
    required_error: "Expense type is required"
  }),
  description: z.string().min(1, "Description is required").max(200, "Description is too long"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  currency: z.string().default("EUR"),
  receiptId: z.string().optional(),

  // Metadata fields (we'll process these into typed metadata)
  customer: z.string().optional(),
  colleagues: z.string().optional(),
  startLocation: z.string().optional(),
  endLocation: z.string().optional(),
  distance: z.number().optional(),
  roundtrip: z.boolean().optional(),
  vehicleType: z.enum(["car", "truck", "motorcycle"]).optional(),
  liters: z.number().optional(),
  location: z.string().optional(),
  nights: z.number().int().positive().optional(),
  room: z.string().optional(),
  duration: z.string().optional(),
  zone: z.string().optional(),
  route: z.string().optional(),
  class: z.enum(["1st", "2nd", "business", "economy"]).optional(),
  departure: z.string().optional(),
  arrival: z.string().optional(),
});

type FormData = z.infer<typeof expenseLineSchema>;

interface ExpenseLineFormProps {
  reportId: string;
  expenseId?: string;
  initialData?: ExpenseLine;
  onSuccess?: (expense: ExpenseLine) => void;
  onCancel?: () => void;
}

export function ExpenseLineForm({
  reportId,
  expenseId,
  initialData,
  onSuccess,
  onCancel,
}: ExpenseLineFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { addExpense, updateExpense, isLoading } = useExpenseLines(reportId);
  const { getCustomerSuggestions, getColleagueSuggestions } = useSuggestions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<string[]>([]);
  const [colleagueSuggestions, setColleagueSuggestions] = useState<string[]>([]);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  // Initialize costPerKm from settings
  const [costPerKm, setCostPerKm] = useState(() => {
    const settings = settingsService.getSettings();
    return settings.fuel?.costPerKm || 0.30; // Default to 0.30 if not set in settings
  });
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Local state for amount to ensure visual updates
  const [localAmount, setLocalAmount] = useState<number>(
    initialData?.amount || 0
  );

  const isEditing = !!expenseId && !!initialData;

  // Parse initial metadata
  const getInitialMetadata = () => {
    if (!initialData?.metadata || typeof initialData.metadata !== 'object') {
      return {};
    }

    // Handle different metadata structures
    if ('data' in initialData.metadata && typeof initialData.metadata.data === 'object') {
      return initialData.metadata.data;
    }

    // Fallback to metadata itself
    const metadata = initialData.metadata;
    return {
      startLocation: metadata.startLocation || "",
      endLocation: metadata.endLocation || "",
      distance: metadata.distance || 0,
      roundtrip: metadata.roundtrip || false,
      vehicleType: metadata.vehicleType || "car",
      liters: metadata.liters || 0,
      customer: metadata.customer || "",
      colleagues: metadata.colleagues || "",
      location: metadata.location || "",
      nights: metadata.nights || 0,
      room: metadata.room || "",
      duration: metadata.duration || "",
      zone: metadata.zone || "",
      route: metadata.route || "",
      class: metadata.class || "",
      departure: metadata.departure || "",
      arrival: metadata.arrival || "",
    };
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(expenseLineSchema),
    defaultValues: {
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      type: initialData?.type || "OTHER",
      description: initialData?.description || "",
      amount: initialData?.amount || 0,
      currency: initialData?.currency || "EUR",
      receiptId: initialData?.receiptId || "",
      ...getInitialMetadata(),
    },
  });

  const watchedType = watch("type");
  const startLocation = watch("startLocation");
  const endLocation = watch("endLocation");
  const distance = watch("distance");
  const roundtrip = watch("roundtrip");

  // Update local amount when form amount changes or roundtrip toggles
  useEffect(() => {
    const formAmount = watch("amount") || 0;
    setLocalAmount(formAmount);
  }, [watch("amount"), roundtrip]);

  // Load suggestions and settings
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const [customers, colleagues] = await Promise.all([
          getCustomerSuggestions(),
          getColleagueSuggestions(),
        ]);
        setCustomerSuggestions(customers);
        setColleagueSuggestions(colleagues);
      } catch (error) {
        console.error("Failed to load suggestions:", error);
      }
    };

    const loadSettings = () => {
      const settings = settingsService.getSettings();
      setCostPerKm(settings.fuel.costPerKm);
    };

    loadSuggestions();
    loadSettings();

    // Mark initial load as complete after a short delay
    const timer = setTimeout(() => setIsInitialLoad(false), 1000);
    return () => clearTimeout(timer);
  }, [getCustomerSuggestions, getColleagueSuggestions]);

  // Distance calculation is now manual only - no automatic calculation

  // Auto-calculate amount when distance, roundtrip, or cost per km changes
  useEffect(() => {
    // Skip auto-calculation during initial load
    if (isInitialLoad) return;

    // Skip auto-calculation when distance calculation is in progress (to avoid conflicts)
    if (isCalculatingDistance) return;

    if (watchedType === "FUEL" && distance && distance > 0 && costPerKm > 0) {
      const multiplier = roundtrip ? 2 : 1;
      const calculatedAmount = distance * costPerKm * multiplier;
      const roundedAmount = Math.round(calculatedAmount * 100) / 100; // Round to 2 decimal places

      setValue("amount", roundedAmount);
      setLocalAmount(roundedAmount);
    }
  }, [distance, roundtrip, costPerKm, watchedType, setValue, isInitialLoad, isCalculatingDistance]);

  // Manual distance calculation function
  const handleCalculateDistance = () => {
    // Read directly from the DOM input elements
    const startLocationInput = document.getElementById("startLocation") as HTMLInputElement;
    const endLocationInput = document.getElementById("endLocation") as HTMLInputElement;
    const amountFieldBefore = document.getElementById("amount") as HTMLInputElement;

    const currentStartLocation = startLocationInput?.value || "";
    const currentEndLocation = endLocationInput?.value || "";

    console.log("🔲 Manual distance calculation triggered");
    console.log("🔲 DOM Start location:", currentStartLocation);
    console.log("🔲 DOM Start location (length):", currentStartLocation?.length);
    console.log("🔲 DOM End location:", currentEndLocation);
    console.log("🔲 DOM End location (length):", currentEndLocation?.length);

    // Check amount field BEFORE calculation
    console.log("💰 BEFORE CALCULATION:");
    console.log("💰 Amount field DOM value:", amountFieldBefore?.value);
    console.log("💰 Amount form value:", watch("amount"));
    console.log("💰 Amount field type:", amountFieldBefore?.type);
    console.log("💰 Amount field disabled:", amountFieldBefore?.disabled);

    // Also compare with React Hook Form values
    console.log("🔲 Form Start location:", watch("startLocation"));
    console.log("🔲 Form End location:", watch("endLocation"));

    if (!currentStartLocation?.trim() || !currentEndLocation?.trim()) {
      toast({
        title: "Missing Addresses",
        description: "Please enter both start and end locations",
        variant: "destructive",
      });
      return;
    }

    // Use the DOM values for calculation
    calculateDistanceWithAddresses(currentStartLocation, currentEndLocation);
  };

  // Generic distance calculation function that accepts addresses as parameters
  const calculateDistanceWithAddresses = async (startLocation: string, endLocation: string) => {
    if (!startLocation || !endLocation) {
      console.log("Missing addresses for distance calculation");
      return;
    }

    if (isCalculatingDistance) {
      console.log("Distance calculation already in progress");
      return;
    }

    console.log(`Calculating distance: ${startLocation} -> ${endLocation}`);
    setIsCalculatingDistance(true);
    setDistanceError(null);

    try {
      const result = await googleMapsService.getDistance(startLocation, endLocation);
      const distanceInKm = GoogleMapsService.metersToKilometers(result.distance.value);

      console.log(`Distance calculated: ${distanceInKm} km`);
      setValue("distance", distanceInKm);

      // Also calculate and set the amount based on distance
      const currentRoundtrip = watch("roundtrip");

      // Use the costPerKm from state (NOT from form - it's not a form field!)
      const currentCostPerKm = costPerKm; // This is the useState variable with value 0.93!

      console.log("💰 Checking amount calculation conditions:");
      console.log("💰 - currentCostPerKm:", currentCostPerKm);
      console.log("💰 - currentRoundtrip:", currentRoundtrip);
      console.log("💰 - Will calculate amount?", currentCostPerKm > 0);

      if (currentCostPerKm > 0) {
        const multiplier = currentRoundtrip ? 2 : 1;
        const calculatedAmount = distanceInKm * currentCostPerKm * multiplier;
        const roundedAmount = Math.round(calculatedAmount * 100) / 100; // Round to 2 decimal places

        console.log(`Amount calculated: ${roundedAmount} EUR (${distanceInKm} km × ${currentCostPerKm} EUR/km × ${multiplier})`);

        // Update form state and local state
        setValue("amount", roundedAmount, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true
        });
        setLocalAmount(roundedAmount);
      } else {
        console.log("💰 WARNING: Cost per km is 0, cannot calculate amount!");
        console.log("💰 Please set a cost per km value in the form or settings");
      }

      // Don't show toast - the user can see the result in the form
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to calculate distance";
      console.error("Distance calculation failed:", error);
      setDistanceError(errorMessage);

      toast({
        title: "Distance Calculation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // For FUEL expenses, read the actual DOM values for locations to ensure we get the selected Google Places values
      if (data.type === "FUEL") {
        const startLocationInput = document.getElementById("startLocation") as HTMLInputElement;
        const endLocationInput = document.getElementById("endLocation") as HTMLInputElement;

        if (startLocationInput?.value) {
          data.startLocation = startLocationInput.value;
        }
        if (endLocationInput?.value) {
          data.endLocation = endLocationInput.value;
        }
      }
      // Process metadata based on expense type
      let metadata: any = undefined;

      switch (data.type) {
        case "FUEL":
          if (data.startLocation || data.endLocation) {
            metadata = {
              type: "FUEL",
              data: {
                startLocation: data.startLocation,
                endLocation: data.endLocation,
                distance: data.distance,
                roundtrip: data.roundtrip || false,
                vehicleType: data.vehicleType,
                liters: data.liters,
              }
            };
          }
          break;

        case "LUNCH":
        case "DINNER":
        case "BREAKFAST":
          if (data.customer || data.colleagues) {
            metadata = {
              type: data.type,
              data: {
                customer: data.customer,
                colleagues: data.colleagues ? data.colleagues.split(',').map(c => c.trim()) : [],
              }
            };
          }
          break;

        case "HOTEL":
          if (data.location || data.nights) {
            metadata = {
              type: "HOTEL",
              data: {
                location: data.location,
                nights: data.nights,
                room: data.room,
              }
            };
          }
          break;

        case "PARKING":
          if (data.duration || data.zone) {
            metadata = {
              type: "PARKING",
              data: {
                duration: data.duration,
                zone: data.zone,
                location: data.location,
              }
            };
          }
          break;

        case "TRAIN":
        case "TELEPASS":
          if (data.route || data.departure) {
            metadata = {
              type: data.type,
              data: {
                route: data.route,
                class: data.class,
                departure: data.departure,
                arrival: data.arrival,
              }
            };
          }
          break;
      }

      const expenseData = {
        date: new Date(data.date),
        type: data.type,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        receiptId: data.receiptId || undefined,
        metadata,
      };

      let result: ExpenseLine;

      if (isEditing) {
        result = await updateExpense(expenseId, expenseData);
        toast({
          title: "Expense Updated",
          description: "Expense line has been updated successfully.",
        });
      } else {
        result = await addExpense(expenseData);
        toast({
          title: "Expense Added",
          description: "New expense line has been added successfully.",
        });
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        router.push(`/reports/${reportId}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save expense line.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push(`/reports/${reportId}`);
    }
  };

  const getExpenseTypeIcon = (type: ExpenseType) => {
    switch (type) {
      case "FUEL":
        return <CarIcon className="w-5 h-5" />;
      case "LUNCH":
      case "DINNER":
      case "BREAKFAST":
        return <UtensilsIcon className="w-5 h-5" />;
      case "HOTEL":
        return <BuildingIcon className="w-5 h-5" />;
      case "PARKING":
        return <ParkingCircleIcon className="w-5 h-5" />;
      case "TRAIN":
      case "TELEPASS":
        return <TrainIcon className="w-5 h-5" />;
      default:
        return <ReceiptIcon className="w-5 h-5" />;
    }
  };

  const renderTypeSpecificFields = () => {
    switch (watchedType) {
      case "FUEL":
        return (
          <div className="space-y-4">
            {/* Start Location - Full width */}
            <div>
              <Label htmlFor="startLocation">Start Location</Label>
              <GooglePlacesAutocomplete
                id="startLocation"
                value={watch("startLocation") || ""}
                onChange={(value) => {
                  setValue("startLocation", value);
                }}
                onPlaceSelect={(place) => {
                  if (place?.formatted_address) {
                    // Make sure the form state is updated with the selected place
                    setValue("startLocation", place.formatted_address);
                  }
                }}
                placeholder="Enter full address (e.g., Via Roma 123, Milano, Italy)"
                className="w-full"
                disabled={isSubmitting}
              />
            </div>

            {/* End Location - Full width */}
            <div>
              <Label htmlFor="endLocation">End Location</Label>
              <GooglePlacesAutocomplete
                id="endLocation"
                value={watch("endLocation") || ""}
                onChange={(value) => {
                  setValue("endLocation", value);
                }}
                onPlaceSelect={(place) => {
                  if (place?.formatted_address) {
                    // Make sure the form state is updated with the selected place
                    setValue("endLocation", place.formatted_address);
                  }
                }}
                placeholder="Enter full address (e.g., Via del Corso 456, Roma, Italy)"
                className="w-full"
                disabled={isSubmitting}
              />
            </div>

            {/* Calculate Distance Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCalculateDistance}
                disabled={isCalculatingDistance}
                className="flex items-center gap-2"
              >
                {isCalculatingDistance ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    Calculating...
                  </>
                ) : (
                  <>
                    🗺️ Calculate Distance
                  </>
                )}
              </Button>
            </div>

            {/* Roundtrip checkbox */}
            <div className="flex items-center space-x-2">
              <input
                id="roundtrip"
                type="checkbox"
                {...register("roundtrip")}
                onChange={(e) => {
                  // Update the form field
                  setValue("roundtrip", e.target.checked);

                  // If we have distance and cost, recalculate amount
                  if (distance > 0 && costPerKm > 0) {
                    const multiplier = e.target.checked ? 2 : 1;
                    const calculatedAmount = distance * costPerKm * multiplier;
                    const roundedAmount = Math.round(calculatedAmount * 100) / 100;

                    setValue("amount", roundedAmount);
                    setLocalAmount(roundedAmount);
                  }
                }}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <Label htmlFor="roundtrip" className="text-sm font-medium">
                Roundtrip (double the distance)
              </Label>
            </div>

            {/* Calculation Display */}
            <div className={`p-4 rounded-lg border ${isCalculatingDistance ? 'bg-yellow-50 border-yellow-200' : distanceError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
              <h4 className={`font-medium mb-2 flex items-center ${isCalculatingDistance ? 'text-yellow-900' : distanceError ? 'text-red-900' : 'text-blue-900'}`}>
                {isCalculatingDistance ? (
                  <>
                    <LoaderIcon className="w-4 h-4 mr-2 animate-spin" />
                    Calculating Distance...
                  </>
                ) : (
                  <>
                    <CalculatorIcon className="w-4 h-4 mr-2" />
                    Distance & Cost Calculation
                  </>
                )}
              </h4>

              {distanceError ? (
                <div className="text-sm text-red-700">
                  <p className="mb-2">❌ {distanceError}</p>
                  <button
                    type="button"
                    onClick={handleCalculateDistance}
                    className="text-red-800 underline hover:no-underline"
                    disabled={isCalculatingDistance}
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className={`text-sm ${isCalculatingDistance ? 'text-yellow-700' : 'text-blue-700'}`}>
                  <p>Distance: {isCalculatingDistance ? 'Calculating...' : `${distance || 0} km`}</p>
                  <p className="flex items-center gap-1">
                    Cost per km: €{costPerKm.toFixed(2)}
                    <button
                      type="button"
                      onClick={() => router.push('/settings')}
                      className="text-blue-600 hover:text-blue-800 underline decoration-dotted text-xs"
                      title="Change in settings"
                    >
                      <SettingsIcon className="w-3 h-3 inline" />
                    </button>
                  </p>
                  <p>Roundtrip: {roundtrip ? "Yes" : "No"}</p>
                  <p className="font-medium mt-2">
                    Calculation: {distance || 0} km × €{costPerKm.toFixed(2)} {roundtrip ? "× 2" : ""} = €
                    {((distance || 0) * costPerKm * (roundtrip ? 2 : 1)).toFixed(2)}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {startLocation && endLocation && (
                      <button
                        type="button"
                        onClick={handleCalculateDistance}
                        className="text-blue-800 underline hover:no-underline text-xs"
                        disabled={isCalculatingDistance}
                      >
                        {isEditing ? "Calculate Distance" : "Recalculate Distance"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => router.push('/settings')}
                      className="text-blue-800 underline hover:no-underline text-xs"
                      disabled={isCalculatingDistance}
                    >
                      Configure Settings
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Distance, Vehicle Type, Liters in one row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="distance">Distance (km)</Label>
                <Input
                  id="distance"
                  type="number"
                  {...register("distance", { valueAsNumber: true })}
                  placeholder="125"
                  readOnly
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated via Google Maps</p>
              </div>
              <div>
                <Label htmlFor="vehicleType">Vehicle Type</Label>
                <Select
                  value={watch("vehicleType") || ""}
                  onValueChange={(value) => setValue("vehicleType", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="liters">Liters</Label>
                <Input
                  id="liters"
                  type="number"
                  step="0.1"
                  {...register("liters", { valueAsNumber: true })}
                  placeholder="45.5"
                />
              </div>
            </div>
          </div>
        );

      case "LUNCH":
      case "DINNER":
      case "BREAKFAST":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer">Customer/Company</Label>
              <Input
                id="customer"
                {...register("customer")}
                placeholder="e.g., ABC Corp"
                list="customers"
              />
              <datalist id="customers">
                {customerSuggestions.map((customer) => (
                  <option key={customer} value={customer} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="colleagues">Colleagues (comma-separated)</Label>
              <Input
                id="colleagues"
                {...register("colleagues")}
                placeholder="e.g., Mario Rossi, Luigi Bianchi"
                list="colleagues"
              />
              <datalist id="colleagues">
                {colleagueSuggestions.map((colleague) => (
                  <option key={colleague} value={colleague} />
                ))}
              </datalist>
            </div>
          </div>
        );

      case "HOTEL":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Hotel Location</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="e.g., Milano"
                />
              </div>
              <div>
                <Label htmlFor="nights">Number of Nights</Label>
                <Input
                  id="nights"
                  type="number"
                  min="1"
                  {...register("nights", { valueAsNumber: true })}
                  placeholder="1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="room">Room Type</Label>
              <Input
                id="room"
                {...register("room")}
                placeholder="e.g., Standard Double"
              />
            </div>
          </div>
        );

      case "PARKING":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  {...register("duration")}
                  placeholder="e.g., 4 hours"
                />
              </div>
              <div>
                <Label htmlFor="zone">Parking Zone</Label>
                <Input
                  id="zone"
                  {...register("zone")}
                  placeholder="e.g., blue, white"
                />
              </div>
            </div>
          </div>
        );

      case "TRAIN":
      case "TELEPASS":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="route">Route</Label>
                <Input
                  id="route"
                  {...register("route")}
                  placeholder="e.g., Roma-Milano"
                />
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Select
                  value={watch("class") || ""}
                  onValueChange={(value) => setValue("class", value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">1st Class</SelectItem>
                    <SelectItem value="2nd">2nd Class</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="economy">Economy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="departure">Departure</Label>
                <Input
                  id="departure"
                  {...register("departure")}
                  placeholder="e.g., Roma Termini"
                />
              </div>
              <div>
                <Label htmlFor="arrival">Arrival</Label>
                <Input
                  id="arrival"
                  {...register("arrival")}
                  placeholder="e.g., Milano Centrale"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-4"
            disabled={isSubmitting}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Report
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? "Edit Expense" : "Add New Expense"}
          </h1>
          <p className="text-slate-600 mt-1">
            {isEditing ? "Update the expense details" : "Add a new expense to your report"}
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {getExpenseTypeIcon(watchedType)}
              <span className="ml-2">Expense Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    {...register("date")}
                    disabled={isSubmitting}
                  />
                  {errors.date && (
                    <p className="text-sm text-red-600">{errors.date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Expense Type *</Label>
                  <Select
                    value={watchedType}
                    onValueChange={(value) => setValue("type", value as ExpenseType)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  {...register("description")}
                  placeholder="e.g., Business lunch at Ristorante Roma"
                  disabled={isSubmitting}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={localAmount || ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setValue("amount", value);
                      setLocalAmount(value);
                    }}
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                  {watchedType === "FUEL" && distance > 0 && costPerKm > 0 && (() => {
                    const calculatedAmount = (distance * costPerKm * (roundtrip ? 2 : 1));
                    const currentAmount = watch("amount") || 0;
                    const isOverridden = Math.abs(currentAmount - calculatedAmount) > 0.01;

                    return isOverridden ? (
                      <p className="text-xs text-amber-600">
                        💡 Auto-calculated: €{calculatedAmount.toFixed(2)} (manually overridden)
                      </p>
                    ) : (
                      <p className="text-xs text-green-600">
                        ✓ Auto-calculated from distance
                      </p>
                    );
                  })()}
                  {errors.amount && (
                    <p className="text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={watch("currency")}
                    onValueChange={(value) => setValue("currency", value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Receipt */}
              <div className="space-y-2">
                <Label htmlFor="receiptId">Receipt ID (Optional)</Label>
                <Input
                  id="receiptId"
                  {...register("receiptId")}
                  placeholder="Receipt file ID or URL"
                  disabled={isSubmitting}
                />
              </div>

              {/* Type-specific fields */}
              {renderTypeSpecificFields()}

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="flex-1"
                >
                  <SaveIcon className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Saving..." : isEditing ? "Update Expense" : "Add Expense"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Tips for {watchedType} expenses:</h3>
          <div className="text-sm text-blue-700">
            {watchedType === "FUEL" && (
              <p>Add start/end locations for automatic distance calculation and route tracking.</p>
            )}
            {(watchedType === "LUNCH" || watchedType === "DINNER" || watchedType === "BREAKFAST") && (
              <p>Include customer and colleague information for business meal documentation.</p>
            )}
            {watchedType === "HOTEL" && (
              <p>Specify location and number of nights for accommodation tracking.</p>
            )}
            {watchedType === "PARKING" && (
              <p>Include duration and zone information for parking expense details.</p>
            )}
            {(watchedType === "TRAIN" || watchedType === "TELEPASS") && (
              <p>Add route and class information for travel expense tracking.</p>
            )}
            {watchedType === "OTHER" && (
              <p>Use clear, descriptive names for miscellaneous business expenses.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}