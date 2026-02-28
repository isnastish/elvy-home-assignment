import axios from "axios";
import type {
  CombinedWeatherResponse,
  ForecastResponse,
  GeocodeResponse,
  Granularity,
  StationsResponse,
} from "../types/weather";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export async function geocodeAddress(
  address: string
): Promise<GeocodeResponse> {
  const { data } = await api.get<GeocodeResponse>("/locations/geocode", {
    params: { address },
  });
  return data;
}

export async function getNearestStations(
  lat: number,
  lon: number
): Promise<StationsResponse> {
  const { data } = await api.get<StationsResponse>("/locations/stations", {
    params: { lat, lon },
  });
  return data;
}

export async function getCombinedWeather(
  lat: number,
  lon: number,
  granularity: Granularity
): Promise<CombinedWeatherResponse> {
  const { data } = await api.get<CombinedWeatherResponse>(
    "/weather/combined",
    {
      params: { lat, lon, granularity },
    }
  );
  return data;
}

export async function getForecast(
  lat: number,
  lon: number,
  metric: string,
  monthsAhead: number = 12
): Promise<ForecastResponse> {
  const { data } = await api.get<ForecastResponse>("/forecast", {
    params: { lat, lon, metric, months_ahead: monthsAhead },
  });
  return data;
}
