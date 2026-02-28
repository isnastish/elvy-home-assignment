import { useState, useEffect } from "react";
import { AddressInput } from "./components/AddressInput";
import { GranularitySelector } from "./components/GranularitySelector";
import { WeatherChart } from "./components/WeatherChart";
import { ForecastPanel } from "./components/ForecastPanel";
import { useWeatherData } from "./hooks/useWeatherData";
import type { GeocodeResult, Granularity } from "./types/weather";

function App() {
  const [selectedLocation, setSelectedLocation] =
    useState<GeocodeResult | null>(null);
  const [granularity, setGranularity] = useState<Granularity>("month");
  const { weatherData, forecastData, loading, error, fetchWeather, fetchForecast } =
    useWeatherData();

  // Fetch weather data when location or granularity changes
  useEffect(() => {
    if (selectedLocation) {
      fetchWeather(
        selectedLocation.latitude,
        selectedLocation.longitude,
        granularity
      );
    }
  }, [selectedLocation, granularity, fetchWeather]);

  function handleLocationSelect(result: GeocodeResult) {
    setSelectedLocation(result);
  }

  function handleFetchForecast(metric: string) {
    if (selectedLocation) {
      fetchForecast(selectedLocation.latitude, selectedLocation.longitude, metric);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-gradient-to-br from-slate-800 to-blue-600 text-white py-8 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-3">
            <span className="text-4xl">⛅</span>
            SMHI Weather Analytics
          </h1>
          <p className="text-base opacity-85">
            Cloud cover and lightning data for Swedish locations
          </p>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full py-8 px-6">
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Find a Location</h2>
          <AddressInput onLocationSelect={handleLocationSelect} />

          {selectedLocation && (
            <div className="flex items-center gap-2 mt-3 px-4 py-2.5 bg-blue-50 rounded-lg text-sm text-slate-800">
              <span className="text-lg">📍</span>
              <span>
                {selectedLocation.display_name} (
                {selectedLocation.latitude.toFixed(4)}°N,{" "}
                {selectedLocation.longitude.toFixed(4)}°E)
              </span>
            </div>
          )}
        </section>

        {selectedLocation && (
          <>
            <section className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Visualization</h2>
              <GranularitySelector
                value={granularity}
                onChange={setGranularity}
              />
            </section>

            <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
              {loading && !weatherData && (
                <div className="flex flex-col items-center gap-4 py-10 text-gray-400 text-base">
                  <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                  Loading weather data from SMHI...
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {weatherData && <WeatherChart data={weatherData} />}
            </section>

            <section className="mb-6">
              <ForecastPanel
                forecastData={forecastData}
                loading={loading}
                onFetchForecast={handleFetchForecast}
              />
            </section>
          </>
        )}

        {!selectedLocation && (
          <section className="text-center py-16 px-6 text-gray-400">
            <div className="text-7xl mb-4">🇸🇪</div>
            <h2 className="text-2xl text-gray-500 mb-3">Welcome</h2>
            <p className="text-base leading-relaxed max-w-lg mx-auto mb-2">
              Enter a Swedish address or city above to view historical cloud
              cover and lightning probability data from SMHI.
            </p>
            <p className="text-sm italic text-gray-300">
              Try: "Stockholm", "Göteborg", "Malmö", "Kiruna"
            </p>
          </section>
        )}
      </main>

      <footer className="text-center py-6 border-t border-gray-200 text-gray-400 text-xs">
        <p>
          Data source:{" "}
          <a
            href="https://opendata.smhi.se"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            SMHI Open Data
          </a>{" "}
          — Meteorological Observations API
        </p>
      </footer>
    </div>
  );
}

export default App;
