import { useState, useMemo } from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import { Box, Typography, Paper, Button, Select, MenuItem, FormControl, CircularProgress } from "@mui/material";
import type { ForecastResponse } from "../types/weather";

interface ForecastPanelProps {
  forecastData: ForecastResponse | null;
  loading: boolean;
  onFetchForecast: (metric: string) => void;
}

function formatPeriod(period: string): string {
  const parts = period.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (parts.length >= 2) return `${months[parseInt(parts[1]) - 1]} '${parts[0].slice(2)}`;
  return period;
}

function metricLabel(metric: string): string {
  return metric === "cloud_cover" ? "Cloud Cover (%)" : "Lightning Strikes";
}

export function ForecastPanel({ forecastData, loading, onFetchForecast }: ForecastPanelProps) {
  const [metric, setMetric] = useState<"cloud_cover" | "lightning">("cloud_cover");

  const chartData = useMemo(() => {
    if (!forecastData) return null;

    const recent = forecastData.historical.slice(-24);
    const allPeriods = [...recent.map((p) => p.period), ...forecastData.forecast.map((p) => p.period)];
    const historicalValues = [...recent.map((p) => p.value), ...Array(forecastData.forecast.length).fill(null)];
    const predictedValues = [
      ...Array(recent.length).fill(null),
      ...forecastData.forecast.map((p) => p.predicted_value),
    ];
    const lowerBounds = [
      ...Array(recent.length).fill(null),
      ...forecastData.forecast.map((p) => p.lower_bound),
    ];
    const upperBounds = [
      ...Array(recent.length).fill(null),
      ...forecastData.forecast.map((p) => p.upper_bound),
    ];

    return { allPeriods, historicalValues, predictedValues, lowerBounds, upperBounds };
  }, [forecastData]);

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AI Forecast
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Ridge regression with seasonal decomposition
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select value={metric} onChange={(e) => setMetric(e.target.value as "cloud_cover" | "lightning")}>
              <MenuItem value="cloud_cover">Cloud Cover</MenuItem>
              <MenuItem value="lightning">Lightning Strikes</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => onFetchForecast(metric)}
            disabled={loading}
            sx={{ bgcolor: "secondary.main", "&:hover": { bgcolor: "secondary.dark" } }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Generate Forecast"}
          </Button>
        </Box>
      </Box>

      {forecastData && chartData && (
        <>
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <Paper sx={{ p: 2, flex: 1, minWidth: 120, textAlign: "center", bgcolor: "grey.50" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase" }}>
                Metric
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                {metricLabel(forecastData.metric)}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, minWidth: 120, textAlign: "center", bgcolor: "grey.50" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase" }}>
                Historical Points
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                {forecastData.historical.length}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, minWidth: 120, textAlign: "center", bgcolor: "secondary.50" }}>
              <Typography variant="caption" sx={{ color: "secondary.main", textTransform: "uppercase" }}>
                Forecast
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, color: "secondary.main" }}>
                {forecastData.forecast.length} months
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, minWidth: 120, textAlign: "center", bgcolor: "grey.50" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase" }}>
                Station
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                {forecastData.station_name}
              </Typography>
            </Paper>
          </Box>

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
              {
                data: chartData.lowerBounds,
                label: "Lower Bound (95% CI)",
                color: "#a78bfa",
                curve: "linear",
                showMark: false,
              },
              {
                data: chartData.upperBounds,
                label: "Upper Bound (95% CI)",
                color: "#a78bfa",
                curve: "linear",
                showMark: false,
              },
            ]}
            yAxis={[{ label: metricLabel(forecastData.metric) }]}
            height={320}
            margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
          />
        </>
      )}

      {!forecastData && !loading && (
        <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
          <Typography>Select a metric and click "Generate Forecast" to see AI predictions.</Typography>
        </Box>
      )}
    </Paper>
  );
}
