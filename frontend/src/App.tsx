import { useState, useEffect } from "react";
import { AddressInput } from "./components/AddressInput";
import { GranularitySelector } from "./components/GranularitySelector";
import { WeatherChart } from "./components/WeatherChart";
import { ForecastPanel } from "./components/ForecastPanel";
import { useWeatherData } from "./hooks/useWeatherData";
import type { GeocodeResult, Granularity } from "./types/weather";
import "./App.css";

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
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="title">
            <span className="title-icon">⛅</span>
            SMHI Weather Analytics
          </h1>
          <p className="subtitle">
            Cloud cover and lightning data for Swedish locations
          </p>
        </div>
      </header>

      <main className="main">
        <section className="search-section">
          <h2 className="section-title">Find a Location</h2>
          <AddressInput onLocationSelect={handleLocationSelect} />

          {selectedLocation && (
            <div className="selected-location">
              <span className="location-pin">📍</span>
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
            <section className="controls-section">
              <h2 className="section-title">Visualization</h2>
              <GranularitySelector
                value={granularity}
                onChange={setGranularity}
              />
            </section>

            <section className="chart-section">
              {loading && !weatherData && (
                <div className="loading">
                  <div className="spinner" />
                  Loading weather data from SMHI...
                </div>
              )}

              {error && (
                <div className="error-message">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {weatherData && <WeatherChart data={weatherData} />}
            </section>

            <section className="forecast-section">
              <ForecastPanel
                forecastData={forecastData}
                loading={loading}
                onFetchForecast={handleFetchForecast}
              />
            </section>
          </>
        )}

        {!selectedLocation && (
          <section className="placeholder">
            <div className="placeholder-icon">🇸🇪</div>
            <h2>Welcome</h2>
            <p>
              Enter a Swedish address or city above to view historical cloud
              cover and lightning probability data from SMHI.
            </p>
            <p className="placeholder-hint">
              Try: "Stockholm", "Göteborg", "Malmö", "Kiruna"
            </p>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>
          Data source:{" "}
          <a
            href="https://opendata.smhi.se"
            target="_blank"
            rel="noopener noreferrer"
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
