import { useState, useMemo } from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import { Box, Typography, Paper, Button, Select, MenuItem, FormControl, CircularProgress } from "@mui/material";
import type { ForecastMetric, ForecastResponse } from "../types/weather";

interface ForecastPanelProps {
  forecastData: ForecastResponse | null;
  loading: boolean;
  onFetchForecast: (metric: ForecastMetric) => void;
}

function formatPeriod(period: string): string {
  const parts = period.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (parts.length >= 2) return `${months[parseInt(parts[1]) - 1]} '${parts[0].slice(2)}`;
  return period;
}

function metricLabel(metric: ForecastMetric): string {
  return metric === "cloud_cover" ? "Cloud Cover (%)" : "Lightning Strikes";
}

export function ForecastPanel({ forecastData, loading, onFetchForecast }: ForecastPanelProps) {
  const [metric, setMetric] = useState<ForecastMetric>("cloud_cover");

  const chartData = useMemo(() => {
    if (!forecastData) return null;

    const recent = forecastData.historical.slice(-24);
    const allPeriods = [...recent.map((p) => p.period), ...forecastData.forecast.map((p) => p.period)];
    const historicalValues = [...recent.map((p) => p.value), ...Array(forecastData.forecast.length).fill(null)];
    const predictedValues = [
      ...Array(recent.length).fill(null),
      ...forecastData.forecast.map((p) => p.predicted_value),
    ];

    return { allPeriods, historicalValues, predictedValues };
  }, [forecastData]);

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 4,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", mb: 0.5 }}>
            Predictive Analytics
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Machine learning forecast using Ridge regression with seasonal decomposition
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <FormControl 
            size="small" 
            sx={{ 
              minWidth: 180,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
          >
            <Select 
              value={metric} 
              onChange={(e) => setMetric(e.target.value as "cloud_cover" | "lightning")}
            >
              <MenuItem value="cloud_cover">Cloud Cover</MenuItem>
              <MenuItem value="lightning">Lightning Strikes</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => onFetchForecast(metric)}
            disabled={loading}
            sx={{ 
              bgcolor: "primary.main", 
              "&:hover": { bgcolor: "primary.dark" },
              px: 3,
              py: 1,
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Generate Forecast"}
          </Button>
        </Box>
      </Box>

      {forecastData && chartData && (
        <>
          <Box sx={{ display: "flex", gap: 2.5, mb: 4, flexWrap: "wrap" }}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2.5, 
                flex: 1, 
                minWidth: 140, 
                textAlign: "center", 
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                Metric
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mt: 1, color: "text.primary" }}>
                {metricLabel(forecastData.metric)}
              </Typography>
            </Paper>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2.5, 
                flex: 1, 
                minWidth: 140, 
                textAlign: "center", 
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                Historical Data Points
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mt: 1, color: "text.primary" }}>
                {forecastData.historical.length}
              </Typography>
            </Paper>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2.5, 
                flex: 1, 
                minWidth: 140, 
                textAlign: "center", 
                background: "linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
                border: "1px solid",
                borderColor: "secondary.300",
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: "secondary.main", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                Forecast Period
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mt: 1, color: "secondary.main" }}>
                {forecastData.forecast.length} months
              </Typography>
            </Paper>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2.5, 
                flex: 1, 
                minWidth: 140, 
                textAlign: "center", 
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                Data Source
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 1, color: "text.primary" }}>
                {forecastData.station_name}
              </Typography>
            </Paper>
          </Box>

          <Box
            sx={{
              p: 3,
              bgcolor: "grey.50",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <LineChart
              xAxis={[
                {
                  scaleType: "band",
                  data: chartData.allPeriods.map(formatPeriod),
                  label: "Period",
                },
              ]}
              series={[
                {
                  data: chartData.historicalValues,
                  label: "Historical",
                  color: "#2563eb",
                  showMark: false,
                },
                {
                  data: chartData.predictedValues,
                  label: "Predicted",
                  color: "#7c3aed",
                  curve: "linear",
                  showMark: true,
                },
              ]}
              yAxis={[{ label: metricLabel(forecastData.metric) }]}
              height={360}
              margin={{ top: 20, right: 40, left: 70, bottom: 70 }}
              grid={{ vertical: true, horizontal: true }}
            />
          </Box>
        </>
      )}

      {!forecastData && !loading && (
        <Box 
          sx={{ 
            textAlign: "center", 
            py: 6,
            px: 3,
            bgcolor: "grey.50",
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "divider",
          }}
        >
          <Typography variant="body1" sx={{ color: "text.secondary", mb: 1, fontWeight: 500 }}>
            No forecast data available
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Select a metric and click "Generate Forecast" to view predictive analytics
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
