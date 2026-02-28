export type Granularity = "day" | "month" | "year";

export interface WeatherDataPoint {
  period: string;
  value: number;
}

export interface CloudCoverResponse {
  station_name: string;
  station_id: number;
  latitude: number;
  longitude: number;
  parameter_description: string;
  granularity: Granularity;
  data: WeatherDataPoint[];
}

export interface LightningResponse {
  station_name: string;
  station_id: number;
  latitude: number;
  longitude: number;
  parameter_description: string;
  granularity: Granularity;
  data: WeatherDataPoint[];
}

export interface CombinedWeatherResponse {
  station_name: string;
  station_id: number;
  latitude: number;
  longitude: number;
  granularity: Granularity;
  cloud_cover: WeatherDataPoint[];
  lightning: WeatherDataPoint[];
}

export interface GeocodeResult {
  display_name: string;
  latitude: number;
  longitude: number;
}

export interface GeocodeResponse {
  results: GeocodeResult[];
}

export interface Station {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  active: boolean;
}

export interface StationsResponse {
  stations: Station[];
  selected_station: Station;
}

export interface ForecastDataPoint {
  period: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastResponse {
  station_name: string;
  station_id: number;
  metric: string;
  historical: WeatherDataPoint[];
  forecast: ForecastDataPoint[];
}
