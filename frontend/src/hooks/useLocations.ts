import { useState, useCallback } from "react";
import type { GeocodeResult } from "../types/weather";
import { geocodeAddress } from "../api/client";

interface UseLocationsReturn {
  results: GeocodeResult[];
  loading: boolean;
  error: string | null;
  search: (address: string) => Promise<void>;
  clear: () => void;
}

export function useLocations(): UseLocationsReturn {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (address: string) => {
    if (!address.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await geocodeAddress(address);
      setResults(data.results);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to geocode address";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clear };
}
