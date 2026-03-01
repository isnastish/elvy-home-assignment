import { useState, useCallback } from "react";
import type {
  CombinedWeatherResponse,
  ForecastMetric,
  ForecastResponse,
  Granularity,
} from "../types/weather";
import { getCombinedWeather, getForecast } from "../api/client";

interface UseWeatherDataReturn {
  weatherData: CombinedWeatherResponse | null;
  forecastData: ForecastResponse | null;
  loading: boolean;
  error: string | null;
  fetchWeather: (lat: number, lon: number, granularity: Granularity) => Promise<void>;
  fetchForecast: (lat: number, lon: number, metric: ForecastMetric) => Promise<void>;
}

export function useWeatherData(): UseWeatherDataReturn {
  const [weatherData, setWeatherData] =
    useState<CombinedWeatherResponse | null>(null);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(
    async (lat: number, lon: number, granularity: Granularity) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCombinedWeather(lat, lon, granularity);
        setWeatherData(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch weather data";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchForecast = useCallback(
    async (lat: number, lon: number, metric: ForecastMetric) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getForecast(lat, lon, metric);
        setForecastData(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch forecast";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { weatherData, forecastData, loading, error, fetchWeather, fetchForecast };
}
