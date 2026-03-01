import { useMemo } from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import { Box, Typography, Paper } from "@mui/material";
import type { CombinedWeatherResponse } from "../types/weather";

interface WeatherChartProps {
  data: CombinedWeatherResponse;
}

function formatPeriod(period: string): string {
  const parts = period.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (parts.length === 3) return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
  if (parts.length === 2) return `${months[parseInt(parts[1]) - 1]} '${parts[0].slice(2)}`;
  return period;
}

function computeStats(values: number[]) {
  if (values.length === 0) return null;
  return {
    avg: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)),
    max: Math.max(...values),
    total: values.reduce((a, b) => a + b, 0),
  };
}

export function WeatherChart({ data }: WeatherChartProps) {
  const cloudData = useMemo(
    () => data.cloud_cover.map((p) => ({ period: p.period, value: p.value })).sort((a, b) => a.period.localeCompare(b.period)),
    [data.cloud_cover],
  );

  const lightningData = useMemo(
    () => data.lightning.map((p) => ({ period: p.period, value: p.value })).sort((a, b) => a.period.localeCompare(b.period)),
    [data.lightning],
  );

  const cloudStats = useMemo(() => computeStats(cloudData.map((d) => d.value)), [cloudData]);
  const lightningStats = useMemo(() => computeStats(lightningData.map((d) => d.value)), [lightningData]);

  if (cloudData.length === 0 && lightningData.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
        <Typography>No data available for this location and granularity.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <Box 
        sx={{ 
          textAlign: "center", 
          p: 2.5,
          bgcolor: "grey.50",
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
          Data Source: <strong style={{ color: "#1a365d" }}>{data.station_name}</strong> (Station ID: {data.station_id})
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
          Coordinates: {data.latitude.toFixed(4)}°N, {data.longitude.toFixed(4)}°E
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 2.5 }}>
        {cloudStats && (
          <>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                textAlign: "center", 
                background: "linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)",
                border: "1px solid",
                borderColor: "info.300",
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: "info.dark", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                Average Cloud Cover
              </Typography>
              <Typography variant="h5" sx={{ color: "info.dark", fontWeight: 700, mt: 1.5, mb: 0.5 }}>
                {cloudStats.avg}%
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                Mean value
              </Typography>
            </Paper>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                textAlign: "center", 
                background: "linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)",
                border: "1px solid",
                borderColor: "info.300",
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: "info.dark", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                Maximum Cloud Cover
              </Typography>
              <Typography variant="h5" sx={{ color: "info.dark", fontWeight: 700, mt: 1.5, mb: 0.5 }}>
                {cloudStats.max}%
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                Peak value
              </Typography>
            </Paper>
          </>
        )}
        {lightningStats && (
          <>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                textAlign: "center", 
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)",
                border: "1px solid",
                borderColor: "warning.300",
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: "warning.dark", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                Total Lightning Strikes
              </Typography>
              <Typography variant="h5" sx={{ color: "warning.dark", fontWeight: 700, mt: 1.5, mb: 0.5 }}>
                {lightningStats.total.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                All periods
              </Typography>
            </Paper>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                textAlign: "center", 
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)",
                border: "1px solid",
                borderColor: "warning.300",
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: "warning.dark", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>
                Peak Lightning Strikes
              </Typography>
              <Typography variant="h5" sx={{ color: "warning.dark", fontWeight: 700, mt: 1.5, mb: 0.5 }}>
                {lightningStats.max.toLocaleString()}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                Maximum value
              </Typography>
            </Paper>
          </>
        )}
      </Box>

      {cloudData.length > 0 && (
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
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: "text.primary" }}>
            Cloud Cover Analysis
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
            Percentage of sky covered by clouds (0% = clear, 100% = overcast)
          </Typography>
          <BarChart
            xAxis={[
              {
                scaleType: "band",
                data: cloudData.map((d) => formatPeriod(d.period)),
                label: "Period",
              },
            ]}
            series={[
              {
                data: cloudData.map((d) => d.value),
                color: "#0ea5e9",
              },
            ]}
            yAxis={[{ label: "Cloud Cover (%)" }]}
            height={320}
            margin={{ top: 20, right: 30, bottom: 70, left: 70 }}
            grid={{ vertical: true, horizontal: true }}
          />
        </Paper>
      )}

      {lightningData.length > 0 && (
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
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: "text.primary" }}>
            Lightning Strike Analysis
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
            Number of lightning strikes detected within the search radius
          </Typography>
          <BarChart
            xAxis={[
              {
                scaleType: "band",
                data: lightningData.map((d) => formatPeriod(d.period)),
                label: "Period",
              },
            ]}
            series={[
              {
                data: lightningData.map((d) => d.value),
                color: "#f59e0b",
              },
            ]}
            yAxis={[{ label: "Lightning Strikes" }]}
            height={320}
            margin={{ top: 20, right: 30, bottom: 70, left: 70 }}
            grid={{ vertical: true, horizontal: true }}
          />
        </Paper>
      )}
    </Box>
  );
}
