import { useState, useEffect } from "react";
import { ThemeProvider, createTheme, CssBaseline, Container, Box, Typography, Paper, Alert, CircularProgress, AppBar, Toolbar } from "@mui/material";
import { AddressInput } from "./components/AddressInput";
import { GranularitySelector } from "./components/GranularitySelector";
import { WeatherChart } from "./components/WeatherChart";
import { ForecastPanel } from "./components/ForecastPanel";
import { useWeatherData } from "./hooks/useWeatherData";
import type { GeocodeResult, Granularity } from "./types/weather";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { 
      main: "#2563eb", // Vibrant professional blue
      dark: "#1e40af",
      light: "#3b82f6",
      contrastText: "#ffffff",
    },
    secondary: { 
      main: "#7c3aed", // Elegant purple
      dark: "#6d28d9",
      light: "#8b5cf6",
    },
    info: {
      main: "#0ea5e9", // Sky blue for cloud data
      dark: "#0284c7",
      light: "#38bdf8",
    },
    warning: { 
      main: "#f59e0b", // Warm amber for lightning
      dark: "#d97706",
      light: "#fbbf24",
    },
    success: {
      main: "#10b981", // Fresh green accent
      dark: "#059669",
      light: "#34d399",
    },
    background: {
      default: "#f8fafc", // Very light gray with slight blue tint
      paper: "#ffffff",
    },
    text: {
      primary: "#1e293b",
      secondary: "#64748b",
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.05), 0px 1px 2px rgba(0, 0, 0, 0.1)",
        },
        elevation1: {
          boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.05), 0px 1px 2px rgba(0, 0, 0, 0.1)",
        },
        elevation2: {
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.05), 0px 2px 4px rgba(0, 0, 0, 0.06)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          borderRadius: 6,
          padding: "8px 20px",
        },
        contained: {
          boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
          "&:hover": {
            boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)",
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 6,
          },
        },
      },
    },
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
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Toolbar sx={{ py: 2 }}>
            <Container maxWidth="lg" sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>
                  SMHI Weather Analytics
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "0.75rem", mt: 0.5, display: "block" }}>
                  Meteorological Data Visualization for Swedish Locations
                </Typography>
              </Box>
            </Container>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ flex: 1, py: 5 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              mb: 4,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: "text.primary" }}>
              Location Search
            </Typography>
            <AddressInput onLocationSelect={setSelectedLocation} />
            {selectedLocation && (
              <Box 
                sx={{ 
                  mt: 3, 
                  p: 2.5, 
                  background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(30, 64, 175, 0.08) 100%)",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "primary.200",
                  display: "flex", 
                  alignItems: "center", 
                  gap: 1.5 
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "1.2rem",
                    boxShadow: "0px 2px 8px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  📍
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: "text.primary" }}>
                    {selectedLocation.display_name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                    {selectedLocation.latitude.toFixed(4)}°N, {selectedLocation.longitude.toFixed(4)}°E
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>

          {selectedLocation && (
            <>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 4, 
                  mb: 4, 
                  position: "relative",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 0.5 }}>
                      Weather Data Visualization
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Historical meteorological observations
                    </Typography>
                  </Box>
                  <GranularitySelector value={granularity} onChange={setGranularity} />
                </Box>

                {loading && weatherData && (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      bgcolor: "rgba(255,255,255,0.95)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                      borderRadius: 2,
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <Box sx={{ textAlign: "center" }}>
                      <CircularProgress size={32} />
                      <Typography variant="body2" sx={{ mt: 2, color: "text.secondary", fontWeight: 500 }}>
                        Updating data...
                      </Typography>
                    </Box>
                  </Box>
                )}

                {loading && !weatherData && (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, py: 8 }}>
                    <CircularProgress size={40} />
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 500, mb: 0.5 }}>
                        Loading weather data
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        Fetching data from SMHI Open Data API...
                      </Typography>
                    </Box>
                  </Box>
                )}

                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3,
                      borderRadius: 2,
                      "& .MuiAlert-icon": {
                        color: "error.main",
                      },
                    }}
                  >
                    {error}
                  </Alert>
                )}

                {weatherData && <WeatherChart data={weatherData} />}
              </Paper>

              <ForecastPanel forecastData={forecastData} loading={loading} onFetchForecast={(metric) => fetchForecast(selectedLocation.latitude, selectedLocation.longitude, metric)} />
            </>
          )}

          {!selectedLocation && (
            <Paper 
              elevation={0}
              sx={{ 
                p: 8, 
                textAlign: "center",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)",
                  border: "2px solid",
                  borderColor: "primary.200",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.5rem",
                  mx: "auto",
                  mb: 3,
                }}
              >
                🇸🇪
              </Box>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}>
                Welcome to SMHI Weather Analytics
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, color: "text.secondary", maxWidth: 600, mx: "auto", lineHeight: 1.7 }}>
                Enter a Swedish address or city above to view historical cloud cover and lightning strike data 
                from the Swedish Meteorological and Hydrological Institute (SMHI).
              </Typography>
              <Box 
                sx={{ 
                  display: "inline-flex",
                  gap: 1.5,
                  flexWrap: "wrap",
                  justifyContent: "center",
                  mt: 2,
                }}
              >
                {["Stockholm", "Göteborg", "Malmö", "Kiruna"].map((city, index) => {
                  const colors = [
                    { bg: "rgba(37, 99, 235, 0.1)", border: "rgba(37, 99, 235, 0.3)", text: "#2563eb" },
                    { bg: "rgba(124, 58, 237, 0.1)", border: "rgba(124, 58, 237, 0.3)", text: "#7c3aed" },
                    { bg: "rgba(14, 165, 233, 0.1)", border: "rgba(14, 165, 233, 0.3)", text: "#0ea5e9" },
                    { bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.3)", text: "#f59e0b" },
                  ];
                  const color = colors[index % colors.length];
                  return (
                    <Box
                      key={city}
                      component="span"
                      sx={{
                        px: 2.5,
                        py: 1,
                        bgcolor: color.bg,
                        border: "1px solid",
                        borderColor: color.border,
                        borderRadius: 2,
                        fontSize: "0.875rem",
                        color: color.text,
                        fontWeight: 600,
                      }}
                    >
                      {city}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          )}
        </Container>

        <Box 
          component="footer" 
          sx={{ 
            textAlign: "center", 
            py: 4, 
            borderTop: "1px solid",
            borderColor: "divider", 
            bgcolor: "background.paper",
            mt: "auto",
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
              Data provided by{" "}
              <a 
                href="https://opendata.smhi.se" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  color: theme.palette.primary.main,
                  textDecoration: "none",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
              >
                SMHI Open Data
              </a>
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
              Meteorological Observations API & Lightning Archive API
            </Typography>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
