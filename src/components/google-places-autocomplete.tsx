"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { env, features } from "@/lib/env";
import { MapPinIcon } from "lucide-react";

interface GooglePlacesAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function GooglePlacesAutocomplete({
  id,
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Enter address",
  className,
  disabled = false,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync value with input when value prop changes
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    // Skip if Google Maps is not enabled or in test environment
    if (!features.enableGoogleMaps || typeof window === "undefined") {
      return;
    }

    const initializeGoogleMaps = async () => {
      try {
        const loader = new Loader({
          apiKey: env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: "weekly",
          libraries: ["places"],
        });

        await loader.load();
        setIsLoaded(true);

        if (inputRef.current && !autocompleteRef.current) {
          // Note: Using the legacy Autocomplete API as the new PlaceAutocompleteElement
          // is still in development. The legacy API will continue to work with bug fixes.
          // We'll migrate to PlaceAutocompleteElement when it's more stable.

          // Suppress deprecation warnings by temporarily overriding console.warn
          const originalWarn = console.warn;
          console.warn = (...args) => {
            if (typeof args[0] === 'string' && args[0].includes('google.maps.places.Autocomplete')) {
              return; // Suppress this specific warning
            }
            originalWarn.apply(console, args);
          };

          try {
            console.log("🔧 Initializing Google Places Autocomplete...");
            // Initialize autocomplete
            autocompleteRef.current = new google.maps.places.Autocomplete(
              inputRef.current,
              {
                types: ["address"],
                fields: ["formatted_address", "geometry", "place_id", "name"],
                // No country restriction - allow addresses from all countries
              }
            );
            console.log("✅ Google Places Autocomplete initialized successfully");

            // Handle place selection
            console.log("🎧 Adding place_changed event listener...");
            autocompleteRef.current.addListener("place_changed", () => {
              console.log("🚨 PLACE_CHANGED EVENT TRIGGERED!");
              const place = autocompleteRef.current?.getPlace();
              console.log("🗺️ GOOGLE PLACE CHANGED:", {
                place: place,
                formatted_address: place?.formatted_address,
                name: place?.name
              });
              if (place && place.formatted_address) {
                // Update the input value immediately for visual feedback
                if (inputRef.current) {
                  inputRef.current.value = place.formatted_address;
                }
                onChange(place.formatted_address);
                onPlaceSelect?.(place);
              }
            });
          } finally {
            // Restore original console.warn
            console.warn = originalWarn;
          }
        }
      } catch (err) {
        console.error("Failed to load Google Maps:", err);
        setError("Failed to load Google Maps autocomplete");
      }
    };

    initializeGoogleMaps();

    // Cleanup
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange, onPlaceSelect]);

  // Fallback to regular input when Google Maps is not available
  if (!features.enableGoogleMaps) {
    return (
      <div className="relative">
        <Input
          id={id}
          ref={inputRef}
          defaultValue={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <MapPinIcon className="w-4 h-4" />
        </div>
        {!env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
          <p className="text-xs text-amber-600 mt-1">
            Google Maps API key not configured - using manual entry
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative">
        <Input
          id={id}
          defaultValue={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-400">
          <MapPinIcon className="w-4 h-4" />
        </div>
        <p className="text-xs text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        id={id}
        ref={inputRef}
        defaultValue={value}
        onChange={(e) => {
          console.log("🎹 MANUAL INPUT CHANGE:", e.target.value);
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        className={className}
        disabled={disabled || !isLoaded}
      />
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        {!isLoaded ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
        ) : (
          <MapPinIcon className="w-4 h-4 text-green-500" />
        )}
      </div>
    </div>
  );
}