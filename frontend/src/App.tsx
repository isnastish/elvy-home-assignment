import { useState, useEffect } from "react";
import { ThemeProvider, createTheme, CssBaseline, Container, Box, Typography, Paper, Alert, CircularProgress } from "@mui/material";
import { AddressInput } from "./components/AddressInput";
import { GranularitySelector } from "./components/GranularitySelector";
import { WeatherChart } from "./components/WeatherChart";
import { ForecastPanel } from "./components/ForecastPanel";
import { useWeatherData } from "./hooks/useWeatherData";
import type { GeocodeResult, Granularity } from "./types/weather";

const theme = createTheme({
  palette: {
    primary: { main: "#2563eb" },
    secondary: { main: "#7c3aed" },
    warning: { main: "#fbbf24" },
  },
});

function App() {
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null);
  const [granularity, setGranularity] = useState<Granularity>("month");
  const { weatherData, forecastData, loading, error, fetchWeather, fetchForecast } = useWeatherData();

  useEffect(() => {
    if (selectedLocation) {
      fetchWeather(selectedLocation.latitude, selectedLocation.longitude, granularity);
    }
  }, [selectedLocation, granularity, fetchWeather]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "grey.50" }}>
        <Paper
          sx={{
            background: "linear-gradient(135deg, #1e293b 0%, #2563eb 100%)",
            color: "white",
            py: 4,
            textAlign: "center",
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
              ⛅ SMHI Weather Analytics
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Cloud cover and lightning strike data for Swedish locations
            </Typography>
          </Container>
        </Paper>

        <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Find a Location
            </Typography>
            <AddressInput onLocationSelect={setSelectedLocation} />
            {selectedLocation && (
              <Box sx={{ mt: 2, p: 2, bgcolor: "primary.50", borderRadius: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <Typography>📍</Typography>
                <Typography variant="body2">
                  {selectedLocation.display_name} ({selectedLocation.latitude.toFixed(4)}°N, {selectedLocation.longitude.toFixed(4)}°E)
                </Typography>
              </Box>
            )}
          </Paper>

          {selectedLocation && (
            <>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Visualization
                </Typography>
                <GranularitySelector value={granularity} onChange={setGranularity} />
              </Box>

              <Paper sx={{ p: 3, mb: 3, position: "relative" }}>
                {loading && weatherData && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      bgcolor: "rgba(255,255,255,0.8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ textAlign: "center" }}>
                      <CircularProgress />
                      <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
                        Updating...
                      </Typography>
                    </Box>
                  </Box>
                )}

                {loading && !weatherData && (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 5 }}>
                    <CircularProgress />
                    <Typography variant="body1" sx={{ color: "text.secondary" }}>
                      Loading weather data from SMHI...
                    </Typography>
                  </Box>
                )}

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {weatherData && <WeatherChart data={weatherData} />}
              </Paper>

              <ForecastPanel forecastData={forecastData} loading={loading} onFetchForecast={(metric) => fetchForecast(selectedLocation.latitude, selectedLocation.longitude, metric)} />
            </>
          )}

          {!selectedLocation && (
            <Paper sx={{ p: 6, textAlign: "center" }}>
              <Typography variant="h2" sx={{ mb: 2 }}>🇸🇪</Typography>
              <Typography variant="h5" sx={{ mb: 2, color: "text.secondary" }}>
                Welcome
              </Typography>
              <Typography variant="body1" sx={{ mb: 1, color: "text.secondary", maxWidth: 500, mx: "auto" }}>
                Enter a Swedish address or city above to view historical cloud cover and lightning strike data from SMHI.
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                Try: "Stockholm", "Göteborg", "Malmö", "Kiruna"
              </Typography>
            </Paper>
          )}
        </Container>

        <Box component="footer" sx={{ textAlign: "center", py: 3, borderTop: 1, borderColor: "divider", bgcolor: "background.paper" }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Data source:{" "}
            <a href="https://opendata.smhi.se" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
              SMHI Open Data
            </a>{" "}
            — Meteorological Observations API
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
