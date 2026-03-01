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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Box sx={{ textAlign: "center", color: "text.secondary", fontSize: "0.875rem" }}>
        <Typography variant="body2">
          Station: <strong>{data.station_name}</strong> (ID: {data.station_id}) — {data.latitude.toFixed(4)}°N, {data.longitude.toFixed(4)}°E
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" }, gap: 2 }}>
        {cloudStats && (
          <>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "primary.50" }}>
              <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 500, textTransform: "uppercase" }}>
                Avg Cloud Cover
              </Typography>
              <Typography variant="h6" sx={{ color: "primary.main", fontWeight: 700, mt: 0.5 }}>
                {cloudStats.avg}%
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "primary.50" }}>
              <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 500, textTransform: "uppercase" }}>
                Max Cloud Cover
              </Typography>
              <Typography variant="h6" sx={{ color: "primary.main", fontWeight: 700, mt: 0.5 }}>
                {cloudStats.max}%
              </Typography>
            </Paper>
          </>
        )}
        {lightningStats && (
          <>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "warning.50" }}>
              <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 500, textTransform: "uppercase" }}>
                Total Strikes
              </Typography>
              <Typography variant="h6" sx={{ color: "warning.main", fontWeight: 700, mt: 0.5 }}>
                {lightningStats.total.toLocaleString()}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "warning.50" }}>
              <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 500, textTransform: "uppercase" }}>
                Peak Strikes
              </Typography>
              <Typography variant="h6" sx={{ color: "warning.main", fontWeight: 700, mt: 0.5 }}>
                {lightningStats.max.toLocaleString()}
              </Typography>
            </Paper>
          </>
        )}
      </Box>

      {cloudData.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Cloud Cover (%)
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
                color: "#64b5f6",
              },
            ]}
            yAxis={[{ label: "Cloud Cover (%)" }]}
            height={300}
            margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
          />
        </Paper>
      )}

      {lightningData.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Lightning Strikes
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
                color: "#fbbf24",
              },
            ]}
            yAxis={[{ label: "Strikes" }]}
            height={300}
            margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
          />
        </Paper>
      )}
    </Box>
  );
}
